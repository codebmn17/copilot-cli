⅚5# GitHub Copilot CLI on Termux - Complete Guide

This guide helps you set up and optimize GitHub Copilot CLI on Termux with support for Ollama model serving and Google Drive storage integration.

## Prerequisites

### Required Packages
```bash
pkg update && pkg upgrade
pkg install nodejs python git curl wget openssl
```

### Optional but Recommended
```bash
pkg install git-lfs  # For large model files
pkg install rsync    # For efficient syncing
```

## Installation

### 1. Install via npm (Recommended for Termux)
```bash
npm install -g @github/copilot
```

### 2. Or use the install script with Termux support
```bash
export PREFIX=$HOME/.local
curl -fsSL https://gh.io/copilot-install | bash
```

Verify installation:
```bash
copilot --version
```

## Termux-Specific Configuration

### Create configuration directory
```bash
mkdir -p ~/.copilot
```

### Set up environment for better performance
Add to `~/.bashrc` or `~/.zshrc`:
```bash
# Copilot CLI environment
export COPILOT_HOME="$HOME/.copilot"
export NODE_OPTIONS="--max-old-space-size=512"
export TMPDIR="$HOME/tmp"
mkdir -p "$TMPDIR"

# For Ollama integration
export OLLAMA_HOST="http://localhost:11434"
```

## Setting up Ollama Server

### Install Ollama (if not running on main device)
On your main Linux machine or server:
```bash
curl https://ollama.ai/install.sh | sh
ollama serve
```

### Configure Copilot to use Ollama
Copilot CLI uses its own models by default, but you can integrate Ollama for local model serving:

1. Start Ollama on your machine:
```bash
ollama serve
```

2. Pull models to Ollama:
```bash
ollama pull llama2      # 3.8B model
ollama pull neural-chat # Smaller option
ollama pull mistral     # 7B model
```

## Google Drive Integration

### Setup Google Drive Authentication

1. **Install Google Drive CLI tools**:
```bash
npm install -g @insync/google-drive-cli
# or
pip install google-drive-api
```

2. **Authenticate**:
```bash
gdrive auth
# Follow the prompts to authenticate
```

3. **Create model storage folder**:
```bash
# Create folder named "copilot-models" in Google Drive
gdrive mkdir copilot-models
```

### Storage Structure in Google Drive
```
copilot-models/
├── ollama-models/
│   ├── llama2/
│   ├── mistral/
│   └── neural-chat/
├── trained-models/
│   ├── project-1/
│   └── project-2/
└── backups/
```

## Model Management in Termux

### Copy Models from Google Drive
```bash
gdrive download <model-folder-id> -r -o $HOME/.copilot/models/
```

### Save Models to Google Drive
```bash
gdrive upload -p <parent-folder-id> $HOME/.copilot/trained-models/
```

### Efficient Model Syncing
For large models, use rsync with compression:
```bash
# Download
rsync -avz --progress remote:/path/to/models $HOME/.copilot/

# Upload
rsync -avz --progress $HOME/.copilot/models remote:/path/to/storage/
```

## Running Copilot CLI

### Basic Usage
```bash
copilot
```

### With Custom Ollama Models
If your Ollama server is on a different machine:
```bash
copilot --mcp-server-config ~/.copilot/ollama-mcp.json
```

### Memory-Optimized Mode (for Termux)
```bash
copilot --no-analytics --no-telemetry
```

## Performance Tips for Termux

### 1. Storage Management
- Keep unused models deleted
- Use Google Drive for archival storage
- Monitor local storage with:
```bash
du -sh ~/.copilot/
```

### 2. Memory Optimization
- Close other apps before running Copilot CLI
- Use lighter models from Ollama (neural-chat vs llama2)
- Set Node memory limit:
```bash
export NODE_OPTIONS="--max-old-space-size=256"
```

### 3. Network Optimization
- Use faster networks (WiFi over mobile data)
- Sync models during off-peak hours
- Use compression when uploading to Google Drive

## Troubleshooting

### Issue: "Not enough space" error
```bash
# Check available storage
df -h

# Clear Termux cache
rm -rf ~/.npm
rm -rf ~/.node-gyp

# Clean old packages
npm cache clean --force
```

### Issue: Ollama connection fails
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If remote, adjust firewall:
# On Ollama machine, expose the service
ollama serve --listen "0.0.0.0:11434"
```

### Issue: Google Drive authentication expires
```bash
gdrive auth --refresh
```

### Issue: Slow model loading
- Check network speed: `speedtest-cli`
- Use smaller models
- Consider local storage caching

## Advanced Setup: Remote Ollama Server

### On your main machine (with good GPU):
```bash
ollama serve --listen "0.0.0.0:11434"
```

### On Termux, configure MCP:
Create `~/.copilot/mcp-servers.json`:
```json
{
  "servers": [
    {
      "name": "ollama-remote",
      "type": "stdio",
      "command": "python",
      "args": ["-m", "ollama_mcp_server"],
      "env": {
        "OLLAMA_HOST": "http://192.168.1.100:11434"
      }
    }
  ]
}
```

## Keeping Models Updated

### Automated daily sync script
Create `~/.local/bin/sync-models.sh`:
```bash
#!/bin/bash
BACKUP_TIME=$(date +%Y%m%d_%H%M%S)
GOOGLE_FOLDER_ID="your-google-folder-id"

# Sync to Google Drive
gdrive upload -p "$GOOGLE_FOLDER_ID" "$HOME/.copilot/trained-models/" 
echo "Sync completed at $BACKUP_TIME"
```

Make executable:
```bash
chmod +x ~/.local/bin/sync-models.sh
```

## Next Steps

1. Set up authentication: `copilot auth`
2. Configure your preferred models
3. Test Ollama integration
4. Set up Google Drive backups
5. Read [official docs](https://docs.github.com/copilot/concepts/agents/about-copilot-cli)

For issues or contributions, visit the [GitHub repository](https://github.com/github/copilot-cli).
