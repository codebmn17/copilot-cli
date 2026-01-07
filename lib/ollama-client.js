#!/usr/bin/env node
/**
 * Ollama Integration Module for GitHub Copilot CLI
 * Enables pulling models from Ollama servers and managing local model cache
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class OllamaClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.host = options.host || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.timeout = options.timeout || 30000;
    this.modelPath = options.modelPath || path.join(process.env.COPILOT_HOME || process.env.HOME, '.copilot/models');
    this.ensureModelPath();
  }

  ensureModelPath() {
    if (!fs.existsSync(this.modelPath)) {
      fs.mkdirSync(this.modelPath, { recursive: true });
    }
  }

  /**
   * Fetch available models from Ollama server
   */
  async listModels() {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.host}/api/tags`);
      const protocol = url.protocol === 'https:' ? https : http;
      
      protocol.get(url, { timeout: this.timeout }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.models || []);
          } catch (e) {
            reject(new Error(`Failed to parse Ollama response: ${e.message}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Pull a model from Ollama server
   */
  async pullModel(modelName, onProgress) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.host}/api/pull`);
      const protocol = url.protocol === 'https:' ? https : http;
      const postData = JSON.stringify({ name: modelName });

      const req = protocol.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: this.timeout
      }, (res) => {
        let buffer = '';
        
        res.on('data', (chunk) => {
          buffer += chunk;
          
          // Process streaming JSON responses
          const lines = buffer.split('\n');
          buffer = lines[lines.length - 1];
          
          lines.slice(0, -1).forEach(line => {
            if (line.trim()) {
              try {
                const status = JSON.parse(line);
                if (onProgress) onProgress(status);
                this.emit('progress', { model: modelName, status });
              } catch (e) {
                // Ignore parse errors
              }
            }
          });
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ success: true, model: modelName });
          } else {
            reject(new Error(`Failed to pull model: HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);

      req.write(postData);
      req.end();
    });
  }

  /**
   * Check if a model exists locally
   */
  async modelExists(modelName) {
    const modelDir = path.join(this.modelPath, modelName.replace(':', '_'));
    return fs.existsSync(modelDir);
  }

  /**
   * Get model information
   */
  async showModel(modelName) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.host}/api/show`);
      const protocol = url.protocol === 'https:' ? https : http;
      const postData = JSON.stringify({ name: modelName });

      const req = protocol.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: this.timeout
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse model info: ${e.message}`));
          }
        });
      }).on('error', reject);

      req.write(postData);
      req.end();
    });
  }

  /**
   * Generate text using Ollama model
   */
  async generate(modelName, prompt, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.host}/api/generate`);
      const protocol = url.protocol === 'https:' ? https : http;
      const postData = JSON.stringify({
        model: modelName,
        prompt: prompt,
        stream: false,
        ...options
      });

      const req = protocol.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: this.timeout
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse generation response: ${e.message}`));
          }
        });
      }).on('error', reject);

      req.write(postData);
      req.end();
    });
  }

  /**
   * Stream text generation (for real-time responses)
   */
  streamGenerate(modelName, prompt, onChunk, options = {}) {
    const url = new URL(`${this.host}/api/generate`);
    const protocol = url.protocol === 'https:' ? https : http;
    const postData = JSON.stringify({
      model: modelName,
      prompt: prompt,
      stream: true,
      ...options
    });

    return new Promise((resolve, reject) => {
      const req = protocol.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: this.timeout
      }, (res) => {
        let buffer = '';
        
        res.on('data', (chunk) => {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines[lines.length - 1];
          
          lines.slice(0, -1).forEach(line => {
            if (line.trim()) {
              try {
                const response = JSON.parse(line);
                onChunk(response);
                if (response.done) {
                  resolve(response);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          });
        });
        
        res.on('end', resolve);
      }).on('error', reject);

      req.write(postData);
      req.end();
    });
  }

  /**
   * Delete/remove a model
   */
  async deleteModel(modelName) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.host}/api/delete`);
      const protocol = url.protocol === 'https:' ? https : http;
      const postData = JSON.stringify({ name: modelName });

      const req = protocol.request(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: this.timeout
      }, (res) => {
        if (res.statusCode === 200) {
          resolve({ success: true, model: modelName });
        } else {
          reject(new Error(`Failed to delete model: HTTP ${res.statusCode}`));
        }
      }).on('error', reject);

      req.write(postData);
      req.end();
    });
  }

  /**
   * Check server health
   */
  async checkHealth() {
    return new Promise((resolve) => {
      const url = new URL(`${this.host}/api/tags`);
      const protocol = url.protocol === 'https:' ? https : http;
      
      const req = protocol.get(url, { timeout: 5000 }, (res) => {
        resolve(res.statusCode === 200);
      }).on('error', () => resolve(false));
      
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Get server status and capabilities
   */
  async getServerInfo() {
    try {
      const isHealthy = await this.checkHealth();
      const models = isHealthy ? await this.listModels() : [];
      
      return {
        available: isHealthy,
        host: this.host,
        models: models.length,
        modelList: models.map(m => m.name)
      };
    } catch (e) {
      return {
        available: false,
        host: this.host,
        error: e.message
      };
    }
  }
}

module.exports = OllamaClient;
