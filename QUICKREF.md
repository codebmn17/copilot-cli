# Quick Reference Card

## Installation

### Termux (Android)
```bash
pkg update && pkg upgrade
pkg install nodejs python git curl wget openssl
curl -fsSL <installer-url> | bash
```

### Linux/macOS
```bash
npm install -g @github/copilot
```

---

## Most Used Commands

### Getting Started
| Command | Purpose |
|---------|---------|
| `copilot` | Start interactive session |
| `copilot /login` | Authenticate with GitHub |
| `/help` | Show all commands |
| `/status` | Show current status |

### Ollama Models
| Command | Purpose |
|---------|---------|
| `/ollama list` | List available models |
| `/ollama pull llama2` | Download a model |
| `/ollama generate "prompt" --model llama2` | Generate text |
| `/ollama delete llama2` | Remove a model |

### Model Management
| Command | Purpose |
|---------|---------|
| `/models list` | List all models |
| `/models pull llama2` | Pull from Ollama |
| `/models train llama2 data.txt` | Train a model |
| `/models storage` | Check storage usage |

### Google Drive
| Command | Purpose |
|---------|---------|
| `/gdrive setup` | Initialize (run once) |
| `/gdrive sync` | Sync to cloud |
| `/gdrive restore` | Download from cloud |
| `/gdrive storage` | Check quota |

---

## Common Workflows

### Setup Workflow
```bash
1. copilot /login                    # Authenticate
2. copilot /gdrive setup             # Setup Google Drive
3. copilot /ollama pull llama2       # Download a model
4. copilot /gdrive sync              # Backup to Google Drive
```

### Training Workflow
```bash
1. copilot /models pull llama2           # Download base model
2. copilot /models train llama2 data.txt # Train on your data
3. copilot /models export training-123   # Export trained model
4. copilot /gdrive sync                  # Backup to cloud
```

### Using Models Workflow
```bash
1. copilot /models list              # See available models
2. copilot /ollama generate "..." --model llama2
3. copilot /models sync              # Sync changes
```

---

## Configuration Files

### Main Config
**Location**: `~/.copilot/config.json`

```json
{
  "ollama": {
    "host": "http://localhost:11434"
  },
  "googleDrive": {
    "backupFolderId": "folder-id"
  },
  "performance": {
    "maxMemory": 512
  }
}
```

### Models Metadata
**Location**: `~/.copilot/models.json`

Shows status of all models and sync info.

---

## Directory Structure

```
~/.copilot/
├── config.json           # Main configuration
├── models.json          # Models metadata
├── models/              # Downloaded models
├── training/            # Training data & results
├── skills/              # Custom skills
├── credentials.json     # Google Drive credentials
└── gdrive-token.json    # Google Drive token
```

---

## Useful Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
alias cm="copilot /models"
alias co="copilot /ollama"
alias cg="copilot /gdrive"
alias cs="copilot /status"

# Examples:
# cm list          →  copilot /models list
# co list          →  copilot /ollama list
# cg sync          →  copilot /gdrive sync
# cs               →  copilot /status
```

---

## Storage Limits

### Termux (Typical)
- Internal Storage: 32-256 GB
- Recommended Models: 2-3 small models
- Cloud Backup: Essential

### Desktop/Server
- Storage: 500GB+ possible
- Models: Can maintain 10+ models
- Local Cache: Recommended

---

## Performance Tips

### Optimize for Termux
```bash
# 1. Set memory limit
export NODE_OPTIONS="--max-old-space-size=256"

# 2. Use smaller models
/models pull neural-chat  # 2.1GB (vs 3.8GB for llama2)

# 3. Clear cache regularly
rm -rf ~/.npm ~/.node-gyp

# 4. Monitor storage
/models storage

# 5. Use compression
/gdrive sync --compress
```

### Network
- Use WiFi for large syncs
- Sync during off-peak hours
- Enable compression for slow connections

---

## Troubleshooting Quick Fixes

### Model Won't Download
```bash
# 1. Check Ollama is running
curl http://localhost:11434/api/tags

# 2. Force re-download
/models pull llama2 --force

# 3. Check disk space
df -h ~/.copilot/
```

### Google Drive Auth Failed
```bash
# 1. Refresh token
/gdrive auth refresh

# 2. Re-authenticate if needed
rm ~/.copilot/gdrive-token.json
/gdrive setup
```

### Out of Memory
```bash
# 1. Delete unused models
/models delete old-model --force

# 2. Clear cache
npm cache clean --force

# 3. Reduce Node.js memory
export NODE_OPTIONS="--max-old-space-size=128"
```

---

## Documentation Quick Links

| Document | Purpose |
|----------|---------|
| [TERMUX_GUIDE.md](TERMUX_GUIDE.md) | Complete Termux setup |
| [GDRIVE_SETUP.md](GDRIVE_SETUP.md) | Google Drive integration |
| [COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md) | All CLI commands |
| [DEPENDENCIES.md](DEPENDENCIES.md) | Package requirements |
| [ENHANCEMENTS.md](ENHANCEMENTS.md) | Feature overview |

---

## Environment Variables

```bash
# Core
export COPILOT_HOME="$HOME/.copilot"          # Config location
export GH_TOKEN="your-token"                  # GitHub token

# Ollama
export OLLAMA_HOST="http://localhost:11434"   # Ollama server
export OLLAMA_DEBUG="1"                       # Debug logging

# Node.js
export NODE_OPTIONS="--max-old-space-size=512"  # Memory limit

# Python
export PYTHONPATH="$HOME/.local/lib/python/site-packages"
```

---

## Module API Quick Reference

### OllamaClient
```javascript
new OllamaClient(options)
  .listModels()
  .pullModel(name, onProgress)
  .generate(model, prompt, options)
  .streamGenerate(model, prompt, onChunk)
  .deleteModel(name)
  .checkHealth()
```

### GoogleDriveManager
```javascript
new GoogleDriveManager(options)
  .authenticate(credentials)
  .uploadDirectory(path, folderId)
  .downloadModels(folderId)
  .syncModels(folderId, options)
  .getStorageInfo()
  .createFolder(name, parentId)
```

### ModelManager
```javascript
new ModelManager(options)
  .pullModel(name)
  .listModels()
  .trainModel(model, data, output)
  .exportModel(trainingId, path)
  .syncToGoogleDrive(folderId)
  .deleteModel(name)
```

---

## Keyboard Shortcuts (in copilot session)

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Exit session |
| `Ctrl+L` | Clear screen |
| `↑/↓` | Browse history |
| `Tab` | Auto-complete |
| `/help` | Show commands |

---

## Support & Resources

- 📖 [Official Docs](https://docs.github.com/copilot/concepts/agents/about-copilot-cli)
- 🐛 [Report Issues](https://github.com/github/copilot-cli/issues)
- 💬 [Discussions](https://github.com/github/copilot-cli/discussions)
- 📝 [Feedback](use `/feedback` command in Copilot CLI)

---

**Last Updated**: January 7, 2025
**Version**: Enhanced Edition
