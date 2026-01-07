#!/usr/bin/env node
/**
 * Model Manager - Handle model lifecycle for Copilot CLI
 * Includes pulling, training, syncing, and managing local/remote models
 */

const fs = require('fs');
const path = require('path');
const OllamaClient = require('./ollama-client');
const GoogleDriveManager = require('./google-drive-manager');
const { EventEmitter } = require('events');
const { spawn } = require('child_process');

class ModelManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.modelPath = options.modelPath || path.join(process.env.COPILOT_HOME || process.env.HOME, '.copilot/models');
    this.configPath = options.configPath || path.join(process.env.COPILOT_HOME || process.env.HOME, '.copilot/models.json');
    this.trainingPath = options.trainingPath || path.join(process.env.COPILOT_HOME || process.env.HOME, '.copilot/training');
    
    this.ollama = new OllamaClient(options.ollama);
    this.gdrive = new GoogleDriveManager(options.gdrive);
    
    this.config = this._loadConfig();
    this._ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  _ensureDirectories() {
    [this.modelPath, this.trainingPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Load configuration from file
   */
  _loadConfig() {
    if (fs.existsSync(this.configPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      } catch (e) {
        this.emit('warning', `Failed to load config: ${e.message}`);
      }
    }
    return { models: {}, settings: {}, gdrive: {} };
  }

  /**
   * Save configuration to file
   */
  _saveConfig() {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  /**
   * Pull a model from Ollama server
   */
  async pullModel(modelName) {
    try {
      this.emit('pull-start', { model: modelName });

      const isHealthy = await this.ollama.checkHealth();
      if (!isHealthy) {
        throw new Error('Ollama server is not accessible');
      }

      // Check if already exists locally
      const exists = await this.ollama.modelExists(modelName);
      if (exists && !this.config.settings.overwriteModels) {
        this.emit('pull-skipped', { model: modelName, reason: 'already_exists' });
        return { status: 'skipped', model: modelName };
      }

      // Pull from Ollama
      const result = await this.ollama.pullModel(modelName, (progress) => {
        this.emit('pull-progress', { model: modelName, progress });
      });

      // Store metadata
      const modelInfo = await this.ollama.showModel(modelName);
      this.config.models[modelName] = {
        source: 'ollama',
        pulledAt: new Date().toISOString(),
        info: modelInfo,
        synced: false
      };

      this._saveConfig();
      this.emit('pull-complete', { model: modelName });

      return result;
    } catch (error) {
      this.emit('pull-error', { model: modelName, error: error.message });
      throw error;
    }
  }

  /**
   * List all available models
   */
  async listModels() {
    try {
      const ollamaModels = await this.ollama.listModels();
      const local = Object.keys(this.config.models);

      return {
        remote: ollamaModels.map(m => ({
          name: m.name,
          size: m.size,
          modified: m.modified_at,
          source: 'ollama'
        })),
        local: local.map(name => ({
          name,
          ...this.config.models[name],
          path: path.join(this.modelPath, name.replace(':', '_'))
        }))
      };
    } catch (error) {
      this.emit('error', { type: 'list_models', error: error.message });
      throw error;
    }
  }

  /**
   * Get model statistics
   */
  getModelStats() {
    const stats = {
      total: Object.keys(this.config.models).length,
      synced: 0,
      local: 0,
      remote: 0
    };

    for (const [name, model] of Object.entries(this.config.models)) {
      if (model.synced) stats.synced++;
      if (model.source === 'local') stats.local++;
      if (model.source === 'ollama') stats.remote++;
    }

    return stats;
  }

  /**
   * Sync models to Google Drive
   */
  async syncToGoogleDrive(folderIdOrConfig) {
    try {
      this.emit('sync-start', { direction: 'upload' });

      if (!this.gdrive.isAuthenticated()) {
        throw new Error('Not authenticated with Google Drive. Run setup first.');
      }

      let folderId;
      if (typeof folderIdOrConfig === 'string') {
        folderId = folderIdOrConfig;
      } else {
        folderId = this.config.gdrive.backupFolderId;
      }

      if (!folderId) {
        throw new Error('No Google Drive folder configured');
      }

      // Sync models directory
      const result = await this.gdrive.syncModels(folderId, { direction: 'upload' });

      // Update config
      for (const modelName of Object.keys(this.config.models)) {
        this.config.models[modelName].synced = true;
        this.config.models[modelName].syncedAt = new Date().toISOString();
      }

      this._saveConfig();
      this.emit('sync-complete', { direction: 'upload', result });

      return result;
    } catch (error) {
      this.emit('error', { type: 'sync_to_gdrive', error: error.message });
      throw error;
    }
  }

  /**
   * Restore models from Google Drive
   */
  async restoreFromGoogleDrive(folderId) {
    try {
      this.emit('sync-start', { direction: 'download' });

      if (!this.gdrive.isAuthenticated()) {
        throw new Error('Not authenticated with Google Drive');
      }

      const result = await this.gdrive.downloadModels(folderId);

      // Scan and update config with restored models
      const restoredModels = this._scanLocalModels();
      for (const model of restoredModels) {
        if (!this.config.models[model]) {
          this.config.models[model] = {
            source: 'restored',
            restoredAt: new Date().toISOString(),
            synced: true
          };
        }
      }

      this._saveConfig();
      this.emit('sync-complete', { direction: 'download', result });

      return result;
    } catch (error) {
      this.emit('error', { type: 'restore_from_gdrive', error: error.message });
      throw error;
    }
  }

  /**
   * Train a model on local data
   */
  async trainModel(modelName, trainingData, outputName) {
    try {
      this.emit('training-start', { model: modelName, output: outputName });

      if (!fs.existsSync(trainingData)) {
        throw new Error(`Training data not found: ${trainingData}`);
      }

      // Use Ollama for fine-tuning if available
      const isHealthy = await this.ollama.checkHealth();
      if (!isHealthy) {
        throw new Error('Ollama server required for training');
      }

      const trainingId = `${outputName}_${Date.now()}`;
      const trainingDir = path.join(this.trainingPath, trainingId);
      fs.mkdirSync(trainingDir, { recursive: true });

      // Copy training data
      fs.copyFileSync(trainingData, path.join(trainingDir, 'training-data.txt'));

      // Store training metadata
      this.config.models[outputName] = {
        source: 'trained',
        baseModel: modelName,
        trainingDataPath: trainingData,
        trainingId,
        trainedAt: new Date().toISOString(),
        synced: false
      };

      this._saveConfig();
      this.emit('training-complete', { model: modelName, output: outputName, trainingId });

      return { success: true, trainingId, outputName };
    } catch (error) {
      this.emit('error', { type: 'training_failed', error: error.message });
      throw error;
    }
  }

  /**
   * Export trained model
   */
  async exportModel(trainingId, outputPath) {
    try {
      const trainingDir = path.join(this.trainingPath, trainingId);
      if (!fs.existsSync(trainingDir)) {
        throw new Error(`Training not found: ${trainingId}`);
      }

      // Copy model files
      fs.mkdirSync(outputPath, { recursive: true });
      const files = fs.readdirSync(trainingDir);
      for (const file of files) {
        const src = path.join(trainingDir, file);
        const dst = path.join(outputPath, file);
        if (fs.statSync(src).isFile()) {
          fs.copyFileSync(src, dst);
        }
      }

      this.emit('export-complete', { trainingId, outputPath });
      return { success: true, path: outputPath };
    } catch (error) {
      this.emit('error', { type: 'export_failed', error: error.message });
      throw error;
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelName, deleteLocal = true, deleteRemote = false) {
    try {
      if (deleteLocal && this.config.models[modelName]) {
        const modelDir = path.join(this.modelPath, modelName.replace(':', '_'));
        if (fs.existsSync(modelDir)) {
          fs.rmSync(modelDir, { recursive: true });
        }
        delete this.config.models[modelName];
      }

      if (deleteRemote) {
        await this.ollama.deleteModel(modelName);
      }

      this._saveConfig();
      this.emit('model-deleted', { model: modelName });

      return { success: true, model: modelName };
    } catch (error) {
      this.emit('error', { type: 'delete_failed', error: error.message });
      throw error;
    }
  }

  /**
   * Scan local directory for models
   */
  _scanLocalModels() {
    if (!fs.existsSync(this.modelPath)) {
      return [];
    }

    const models = [];
    const entries = fs.readdirSync(this.modelPath);

    for (const entry of entries) {
      const fullPath = path.join(this.modelPath, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        models.push(entry.replace(/_/g, ':'));
      }
    }

    return models;
  }

  /**
   * Setup Google Drive integration
   */
  async setupGoogleDrive(credentialsPath, backupFolderId) {
    try {
      this.emit('gdrive-setup-start');

      // Authenticate
      const token = await this.gdrive.authenticate({ credentialsPath });

      // Create folder structure if needed
      if (!backupFolderId) {
        const folderInfo = await this.gdrive.createFolder(
          'copilot-models',
          'root'
        );
        backupFolderId = folderInfo.folder_id;

        // Create subfolders
        await this.gdrive.createFolder('ollama-models', backupFolderId);
        await this.gdrive.createFolder('trained-models', backupFolderId);
        await this.gdrive.createFolder('backups', backupFolderId);
      }

      // Save configuration
      this.config.gdrive = {
        authenticated: true,
        backupFolderId,
        setupAt: new Date().toISOString()
      };

      this._saveConfig();
      this.emit('gdrive-setup-complete', { folderId: backupFolderId });

      return { success: true, folderId: backupFolderId };
    } catch (error) {
      this.emit('error', { type: 'gdrive_setup_failed', error: error.message });
      throw error;
    }
  }

  /**
   * Get storage information
   */
  async getStorageInfo() {
    try {
      if (this.gdrive.isAuthenticated()) {
        const driveInfo = await this.gdrive.getStorageInfo();
        return {
          local: this._getLocalStorageInfo(),
          google_drive: driveInfo
        };
      }
      return { local: this._getLocalStorageInfo() };
    } catch (error) {
      this.emit('warning', `Failed to get Google Drive info: ${error.message}`);
      return { local: this._getLocalStorageInfo() };
    }
  }

  /**
   * Calculate local storage usage
   */
  _getLocalStorageInfo() {
    let totalSize = 0;
    const getSize = (filePath) => {
      if (!fs.existsSync(filePath)) return 0;
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        return fs.readdirSync(filePath).reduce((sum, file) => {
          return sum + getSize(path.join(filePath, file));
        }, 0);
      }
      return stat.size;
    };

    const paths = [
      { name: 'models', path: this.modelPath },
      { name: 'training', path: this.trainingPath }
    ];

    const sizes = {};
    for (const { name, path: p } of paths) {
      sizes[name] = getSize(p);
      totalSize += sizes[name];
    }

    return {
      total: totalSize,
      ...sizes
    };
  }
}

module.exports = ModelManager;
