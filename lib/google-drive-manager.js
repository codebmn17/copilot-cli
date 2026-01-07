#!/usr/bin/env node
/**
 * Google Drive Integration Module for GitHub Copilot CLI
 * Enables syncing models and data to Google Drive for cloud backup and cross-device access
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class GoogleDriveManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.credentialsPath = options.credentialsPath || path.join(process.env.HOME, '.copilot/gdrive-credentials.json');
    this.tokenPath = options.tokenPath || path.join(process.env.HOME, '.copilot/gdrive-token.json');
    this.modelPath = options.modelPath || path.join(process.env.HOME, '.copilot/models');
    this.trainingDataPath = options.trainingDataPath || path.join(process.env.HOME, '.copilot/training');
    this.backupPath = options.backupPath || 'copilot-models';
    this.usePythonSDK = options.usePythonSDK !== false; // Use Python SDK if available
  }

  /**
   * Initialize Google Drive authentication
   */
  async authenticate(credentials) {
    try {
      if (this.usePythonSDK) {
        return await this._authenticatePython(credentials);
      } else {
        return await this._authenticateNode(credentials);
      }
    } catch (error) {
      this.emit('error', { type: 'auth_failed', error: error.message });
      throw error;
    }
  }

  /**
   * Python SDK authentication (recommended for Termux)
   */
  async _authenticatePython(credentials) {
    try {
      const setupScript = this._generatePythonAuthScript();
      const scriptPath = path.join(os.tmpdir(), 'gdrive_auth.py');
      fs.writeFileSync(scriptPath, setupScript);
      
      const { stdout } = await execAsync(`python "${scriptPath}"`);
      const token = JSON.parse(stdout);
      
      fs.writeFileSync(this.tokenPath, JSON.stringify(token, null, 2));
      
      // Set secure permissions (cross-platform compatible)
      try {
        fs.chmodSync(this.tokenPath, 0o600);
      } catch (e) {
        // Windows doesn't support chmod, ignore error
        if (process.platform !== 'win32') throw e;
      }
      
      this.emit('authenticated', { method: 'python' });
      return token;
    } catch (error) {
      throw new Error(`Python authentication failed: ${error.message}`);
    }
  }

  /**
   * Node.js SDK authentication fallback
   */
  async _authenticateNode(credentials) {
    // This would use the official Google Drive API client
    // For now, we recommend the Python approach for Termux compatibility
    throw new Error('Node.js Google Drive authentication requires additional setup. Use Python SDK instead.');
  }

  /**
   * Generate Python authentication script
   */
  _generatePythonAuthScript() {
    return `
import json
import sys
from google.auth.transport.requests import Request
from google.oauth2.service_account import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ['https://www.googleapis.com/auth/drive']

def authenticate():
    flow = InstalledAppFlow.from_client_secrets_file(
        '${this.credentialsPath}', 
        SCOPES
    )
    creds = flow.run_local_server(port=0)
    
    # Return token info as JSON
    token_data = {
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': creds.token_uri,
        'client_id': creds.client_id,
        'client_secret': creds.client_secret,
        'scopes': creds.scopes
    }
    
    print(json.dumps(token_data))
    return token_data

if __name__ == '__main__':
    try:
        authenticate()
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)
`;
  }

  /**
   * Upload a directory to Google Drive
   */
  async uploadDirectory(localPath, parentFolderId, options = {}) {
    if (!fs.existsSync(localPath)) {
      throw new Error(`Directory not found: ${localPath}`);
    }

    const stats = fs.statSync(localPath);
    if (!stats.isDirectory()) {
      throw new Error(`Not a directory: ${localPath}`);
    }

    const dirName = path.basename(localPath);
    const uploadScript = this._generateUploadScript(localPath, parentFolderId, options);
    
    return await this._executePythonScript(uploadScript, {
      onProgress: (progress) => this.emit('upload-progress', progress)
    });
  }

  /**
   * Download models from Google Drive
   */
  async downloadModels(parentFolderId, options = {}) {
    const downloadScript = this._generateDownloadScript(parentFolderId, this.modelPath, options);
    
    return await this._executePythonScript(downloadScript, {
      onProgress: (progress) => this.emit('download-progress', progress)
    });
  }

  /**
   * Sync models bidirectionally
   */
  async syncModels(folderId, options = {}) {
    const direction = options.direction || 'both'; // 'upload', 'download', or 'both'
    const results = { uploaded: [], downloaded: [] };

    try {
      if (direction === 'upload' || direction === 'both') {
        this.emit('sync-status', { stage: 'uploading' });
        const uploaded = await this.uploadDirectory(this.modelPath, folderId, options);
        results.uploaded = uploaded;
      }

      if (direction === 'download' || direction === 'both') {
        this.emit('sync-status', { stage: 'downloading' });
        const downloaded = await this.downloadModels(folderId, options);
        results.downloaded = downloaded;
      }

      this.emit('sync-complete', results);
      return results;
    } catch (error) {
      this.emit('error', { type: 'sync_failed', error: error.message });
      throw error;
    }
  }

  /**
   * List contents of a Google Drive folder
   */
  async listFolderContents(folderId) {
    const script = this._generateListScript(folderId);
    return await this._executePythonScript(script);
  }

  /**
   * Create a folder in Google Drive
   */
  async createFolder(folderName, parentFolderId) {
    const script = this._generateCreateFolderScript(folderName, parentFolderId);
    return await this._executePythonScript(script);
  }

  /**
   * Get storage quota information
   */
  async getStorageInfo() {
    const script = `
from google.oauth2.service_account import Credentials
from google.auth.transport.requests import Request
import googleapiclient.discovery
import json

def get_storage_info():
    creds = Credentials.from_service_account_file(
        '${this.tokenPath}',
        scopes=['https://www.googleapis.com/auth/drive']
    )
    
    service = googleapiclient.discovery.build('drive', 'v3', credentials=creds)
    about = service.about().get(fields='storageQuota').execute()
    quota = about.get('storageQuota', {})
    
    print(json.dumps({
        'limit': quota.get('limit'),
        'usage': quota.get('usage'),
        'usageInDrive': quota.get('usageInDrive'),
        'usageInTrash': quota.get('usageInTrash')
    }))

if __name__ == '__main__':
    get_storage_info()
`;
    return await this._executePythonScript(script);
  }

  /**
   * Generate Python upload script
   */
  _generateUploadScript(localPath, parentFolderId, options) {
    const compress = options.compress === true;
    return `
import os
import json
import sys
from pathlib import Path
from google.oauth2.service_account import Credentials
import googleapiclient.discovery
${compress ? 'import tarfile' : ''}

def upload_directory():
    creds = Credentials.from_service_account_file(
        '${this.tokenPath}',
        scopes=['https://www.googleapis.com/auth/drive']
    )
    
    service = googleapiclient.discovery.build('drive', 'v3', credentials=creds)
    
    local_path = '${localPath}'
    parent_id = '${parentFolderId}'
    
    ${compress ? `
    # Compress directory before upload
    tar_path = '/tmp/backup.tar.gz'
    with tarfile.open(tar_path, 'w:gz') as tar:
        tar.add(local_path, arcname=os.path.basename(local_path))
    
    file_metadata = {'name': os.path.basename(local_path) + '.tar.gz', 'parents': [parent_id]}
    media = googleapiclient.http.MediaFileUpload(tar_path, resumable=True)
    file = service.files().create(body=file_metadata, media_body=media).execute()
    
    os.remove(tar_path)
    ` : `
    # Upload each file
    for root, dirs, files in os.walk(local_path):
        for file in files:
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, local_path)
            
            file_metadata = {'name': rel_path, 'parents': [parent_id]}
            media = googleapiclient.http.MediaFileUpload(file_path)
            file = service.files().create(body=file_metadata, media_body=media).execute()
            
            print(json.dumps({'uploaded': file_path, 'drive_id': file.get('id')}))
    `}
    
    print(json.dumps({'status': 'completed', 'path': local_path}))

if __name__ == '__main__':
    upload_directory()
`;
  }

  /**
   * Generate Python download script
   */
  _generateDownloadScript(folderId, outputPath, options) {
    return `
import os
import json
from google.oauth2.service_account import Credentials
import googleapiclient.discovery
import googleapiclient.http

def download_folder():
    creds = Credentials.from_service_account_file(
        '${this.tokenPath}',
        scopes=['https://www.googleapis.com/auth/drive']
    )
    
    service = googleapiclient.discovery.build('drive', 'v3', credentials=creds)
    
    folder_id = '${folderId}'
    output_path = '${outputPath}'
    
    os.makedirs(output_path, exist_ok=True)
    
    def download_files(parent_id, local_dir):
        query = f"'{parent_id}' in parents and trashed=false"
        results = service.files().list(q=query, fields='files(id, name, mimeType)').execute()
        items = results.get('files', [])
        
        for item in items:
            if item['mimeType'] == 'application/vnd.google-apps.folder':
                # Create subdirectory
                new_dir = os.path.join(local_dir, item['name'])
                os.makedirs(new_dir, exist_ok=True)
                download_files(item['id'], new_dir)
            else:
                # Download file
                file_path = os.path.join(local_dir, item['name'])
                request = service.files().get_media(fileId=item['id'])
                with open(file_path, 'wb') as f:
                    downloader = googleapiclient.http.MediaIoBaseDownload(f, request)
                    done = False
                    while not done:
                        status, done = downloader.next_chunk()
                print(json.dumps({'downloaded': file_path}))
    
    download_files(folder_id, output_path)
    print(json.dumps({'status': 'completed', 'path': output_path}))

if __name__ == '__main__':
    download_folder()
`;
  }

  /**
   * Generate Python list script
   */
  _generateListScript(folderId) {
    return `
import json
from google.oauth2.service_account import Credentials
import googleapiclient.discovery

def list_contents():
    creds = Credentials.from_service_account_file(
        '${this.tokenPath}',
        scopes=['https://www.googleapis.com/auth/drive']
    )
    
    service = googleapiclient.discovery.build('drive', 'v3', credentials=creds)
    
    query = f"'{${folderId}}' in parents and trashed=false"
    results = service.files().list(q=query, fields='files(id, name, mimeType, size, modifiedTime)').execute()
    items = results.get('files', [])
    
    output = []
    for item in items:
        output.append({
            'id': item['id'],
            'name': item['name'],
            'type': 'folder' if item['mimeType'] == 'application/vnd.google-apps.folder' else 'file',
            'size': item.get('size', 0),
            'modified': item.get('modifiedTime')
        })
    
    print(json.dumps(output))

if __name__ == '__main__':
    list_contents()
`;
  }

  /**
   * Generate Python create folder script
   */
  _generateCreateFolderScript(folderName, parentFolderId) {
    return `
import json
from google.oauth2.service_account import Credentials
import googleapiclient.discovery

def create_folder():
    creds = Credentials.from_service_account_file(
        '${this.tokenPath}',
        scopes=['https://www.googleapis.com/auth/drive']
    )
    
    service = googleapiclient.discovery.build('drive', 'v3', credentials=creds)
    
    file_metadata = {
        'name': '${folderName}',
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': ['${parentFolderId}']
    }
    
    folder = service.files().create(body=file_metadata, fields='id').execute()
    print(json.dumps({'folder_id': folder['id'], 'name': '${folderName}'}))

if __name__ == '__main__':
    create_folder()
`;
  }

  /**
   * Execute a Python script and return results with retry logic
   */
  async _executePythonScript(script, options = {}) {
    const maxRetries = options.maxRetries || 2;
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this._executeScriptAttempt(script, options);
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          // Wait before retrying (exponential backoff)
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
          this.emit('retry', { attempt: attempt + 1, error: error.message });
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Single attempt to execute a Python script
   */
  async _executeScriptAttempt(script, options = {}) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(os.tmpdir(), `gdrive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`);
      
      try {
        fs.writeFileSync(scriptPath, script);
      } catch (e) {
        reject(new Error(`Failed to write script file: ${e.message}`));
        return;
      }

      exec(`python "${scriptPath}"`, { timeout: 60000 }, (error, stdout, stderr) => {
        try {
          fs.unlinkSync(scriptPath);
        } catch (e) {
          // Ignore cleanup errors
        }

        if (error) {
          reject(new Error(`Script execution failed: ${stderr || error.message}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          if (options.onProgress) options.onProgress(result);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse script output: ${parseError.message}`));
        }
      });
    });
  }

  /**
   * Check if authenticated
   */
  isAuthenticated() {
    return fs.existsSync(this.tokenPath);
  }

  /**
   * Revoke authentication
   */
  revokeAuth() {
    if (fs.existsSync(this.tokenPath)) {
      fs.unlinkSync(this.tokenPath);
      this.emit('auth-revoked');
    }
  }
}

module.exports = GoogleDriveManager;
