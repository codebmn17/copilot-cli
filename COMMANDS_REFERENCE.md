# GitHub Copilot CLI - Extended Commands Reference

This document lists the new extended commands for Ollama, Google Drive, and model management that are available when the extended features are enabled.

## Ollama Commands

### `/ollama list`
List all available models on the connected Ollama server.

**Syntax:**
```
/ollama list [--local] [--remote]
```

**Examples:**
```bash
/ollama list                  # Show all models
/ollama list --local          # Show only local models
/ollama list --remote         # Show only remote models
```

**Output:**
```
Remote Models (from Ollama server):
  ✓ llama2:latest           [3.8B]  - 2 days ago
  ✓ neural-chat:latest      [2.1B]  - 1 week ago
  ✓ mistral:latest          [7.3B]  - 3 days ago

Local Models (cached):
  ✓ llama2:latest           [3.8B]  - Synced
  ✓ neural-chat:latest      [2.1B]  - Not synced
```

### `/ollama pull <model>`
Pull a model from the Ollama server and cache it locally.

**Syntax:**
```
/ollama pull <model-name> [--sync] [--force]
```

**Parameters:**
- `<model-name>`: Name of model to pull (e.g., `llama2`, `mistral:latest`)
- `--sync`: Automatically sync to Google Drive after pulling
- `--force`: Re-download even if already exists locally

**Examples:**
```bash
/ollama pull llama2                    # Pull default model
/ollama pull mistral:latest --sync     # Pull and sync to Drive
/ollama pull neural-chat --force       # Force re-download
```

### `/ollama push <model>`
Push a trained or modified model to the Ollama server.

**Syntax:**
```
/ollama push <model-name> [--replace]
```

### `/ollama generate`
Generate text using a specified Ollama model.

**Syntax:**
```
/ollama generate "<prompt>" [--model <name>] [--temperature 0.7] [--top-p 0.9]
```

**Examples:**
```bash
/ollama generate "Write a Python function to reverse a list" --model llama2
/ollama generate "Explain quantum computing" --model mistral --temperature 0.5
```

### `/ollama delete <model>`
Remove a model from local cache or Ollama server.

**Syntax:**
```
/ollama delete <model-name> [--remote] [--local] [--all]
```

### `/ollama info <model>`
Show detailed information about a model.

**Syntax:**
```
/ollama info <model-name>
```

**Output:**
```
Model: llama2:latest
Size: 3.8GB
Architecture: LLaMA
Parameters: 7B
Description: Fast language model for general tasks
Created: 2024-12-15
Status: Available locally
Last used: 2025-01-07 10:30:00
```

## Google Drive Commands

### `/gdrive setup`
Initialize Google Drive integration for the first time.

**Syntax:**
```
/gdrive setup [--folder-id <id>] [--auto-sync]
```

**Examples:**
```bash
/gdrive setup                                    # Interactive setup
/gdrive setup --auto-sync                       # Enable auto-sync
/gdrive setup --folder-id "abc123xyz789"        # Use existing folder
```

### `/gdrive sync`
Synchronize models to/from Google Drive.

**Syntax:**
```
/gdrive sync [--direction {both|upload|download}] [--compress] [--confirm]
```

**Parameters:**
- `--direction`: Sync direction (`both`, `upload`, `download`)
- `--compress`: Use gzip compression for faster transfer
- `--confirm`: Skip confirmation prompts

**Examples:**
```bash
/gdrive sync                           # Sync bidirectionally
/gdrive sync --direction upload        # Upload only
/gdrive sync --direction download      # Download only
/gdrive sync --compress --confirm      # Fast sync with compression
```

### `/gdrive status`
Show current sync status and last sync time.

**Syntax:**
```
/gdrive status [--verbose]
```

**Output:**
```
Google Drive Status:
  Authenticated: Yes
  Backup Folder: copilot-models
  Last Sync: 2025-01-07 14:30:00
  Models Synced: 3/5
  Storage Used: 14.2 GB / 100 GB

Pending Changes:
  - llama2:latest (new) - 3.8 GB
  - neural-chat (modified) - 2.1 GB
```

### `/gdrive restore [--folder <name>]`
Download and restore models from Google Drive.

**Syntax:**
```
/gdrive restore [--folder <name>] [--select] [--overwrite]
```

**Parameters:**
- `--folder`: Specific folder to restore (defaults to all)
- `--select`: Interactive selection of which models to restore
- `--overwrite`: Replace existing models

**Examples:**
```bash
/gdrive restore                          # Restore all
/gdrive restore --folder trained-models  # Restore only trained models
/gdrive restore --select                 # Choose which to restore
```

### `/gdrive upload <path>`
Upload a specific directory or file.

**Syntax:**
```
/gdrive upload <path> [--target <folder>] [--compress]
```

**Examples:**
```bash
/gdrive upload ~/.copilot/models/custom --target trained-models
/gdrive upload my-training-data.txt --compress
```

### `/gdrive storage`
Check Google Drive storage quota and usage.

**Syntax:**
```
/gdrive storage [--detailed]
```

**Output:**
```
Google Drive Storage:
  Total: 100 GB
  Used: 45.3 GB
  Available: 54.7 GB
  Usage %: 45.3%

Breakdown:
  Models: 30.2 GB
  Training Data: 10.5 GB
  Backups: 4.6 GB
```

### `/gdrive list [--folder <id>]`
List contents of Google Drive folder.

**Syntax:**
```
/gdrive list [--folder <id>] [--detailed] [--sort {name|date|size}]
```

### `/gdrive auth`
Manage Google Drive authentication.

**Syntax:**
```
/gdrive auth {setup|refresh|revoke|status}
```

**Examples:**
```bash
/gdrive auth status         # Check auth status
/gdrive auth refresh        # Refresh access token
/gdrive auth revoke         # Remove authorization
```

## Model Management Commands

### `/models list`
List all available models (local and remote).

**Syntax:**
```
/models list [--local] [--remote] [--trained] [--format {table|json}]
```

**Examples:**
```bash
/models list                      # Show all models
/models list --trained            # Show only trained models
/models list --format json        # Output as JSON
```

### `/models pull <model-name>`
Pull a model from Ollama server.

**Syntax:**
```
/models pull <model-name> [--sync] [--cache]
```

**Examples:**
```bash
/models pull llama2
/models pull mistral:7b --sync
```

### `/models train <model> <data-file>`
Train a model on provided data.

**Syntax:**
```
/models train <base-model> <data-file> [--output <name>] [--epochs 3] [--batch-size 32]
```

**Parameters:**
- `<base-model>`: Model to fine-tune (e.g., `llama2`)
- `<data-file>`: Path to training data (JSONL or TXT)
- `--output`: Custom name for trained model
- `--epochs`: Number of training epochs
- `--batch-size`: Batch size for training

**Examples:**
```bash
/models train llama2 training-data.jsonl
/models train mistral my-data.txt --output my-model --epochs 5
```

### `/models export <training-id> [--path]`
Export a trained model to a directory.

**Syntax:**
```
/models export <training-id> [--output <path>] [--format {bin|safetensors}]
```

**Examples:**
```bash
/models export training-123 --output ./my-model
/models export training-456 --output ~/models/ --format safetensors
```

### `/models delete <model-name>`
Delete a model from local storage.

**Syntax:**
```
/models delete <model-name> [--force] [--remote]
```

**Parameters:**
- `--force`: Delete without confirmation
- `--remote`: Also delete from Ollama server

**Examples:**
```bash
/models delete old-model
/models delete unused-model --force --remote
```

### `/models storage`
Check local model storage usage.

**Syntax:**
```
/models storage [--detailed] [--limit-by <size>]
```

**Output:**
```
Local Model Storage:
  Total: 18.5 GB
  
  Breakdown:
  - llama2:latest         3.8 GB  [||||||||||||      ] 20%
  - mistral:latest        7.3 GB  [||||||||||||||||||] 39%
  - neural-chat:latest    2.1 GB  [||||||           ] 11%
  - custom-trained        5.3 GB  [|||||||||||||    ] 29%
  
  Largest Models:
  1. mistral:latest       7.3 GB  (delete with: /models delete mistral:latest)
  2. custom-trained       5.3 GB  (backed up: No)
```

### `/models sync`
Manually sync models to Google Drive.

**Syntax:**
```
/models sync [--direction {up|down|both}] [--confirm]
```

**Examples:**
```bash
/models sync                     # Sync everything
/models sync --direction up      # Upload only
/models sync --direction down    # Download only
```

### `/models info <model-name>`
Show detailed information about a model.

**Syntax:**
```
/models info <model-name> [--include-metadata]
```

## Configuration Commands

### `/config set <key> <value>`
Set configuration values.

**Examples:**
```bash
/config set ollama.host http://192.168.1.100:11434
/config set googleDrive.autoSync true
/config set performance.maxMemory 256
```

### `/config get [<key>]`
Get configuration values.

**Examples:**
```bash
/config get                           # Show all config
/config get ollama.host              # Show specific value
```

### `/config reset`
Reset configuration to defaults.

**Syntax:**
```
/config reset [--section <section>]
```

## Help and Status

### `/help`
Show all available commands.

### `/status`
Show current session status.

**Output:**
```
GitHub Copilot CLI Status:
  
Session:
  Model: claude-sonnet-4.5
  Models Available: 5
  Storage: 18.5/500 GB (3.7%)
  
Ollama Server:
  Status: Connected
  Host: http://localhost:11434
  Models Available: 8
  
Google Drive:
  Status: Authenticated
  Storage: 45.3/100 GB (45.3%)
  
Recent Activity:
  - Downloaded llama2 (5 min ago)
  - Synced to Google Drive (2 hours ago)
  - Trained custom-model (1 day ago)
```

## Tips and Tricks

### Batch Operations

```bash
# Download multiple models
/models pull llama2
/models pull mistral
/models pull neural-chat

# Then sync all at once
/gdrive sync
```

### Automated Backup

```bash
# Add to crontab for daily backups
# 0 2 * * * copilot /gdrive sync --confirm --compress
```

### Memory Management

```bash
# List and delete large unused models
/models storage --limit-by 5gb
/models delete llama2 --force
/gdrive sync --direction up --compress
```

## Command Aliases

Add these to your shell profile for quick access:

```bash
alias cm="copilot /models"
alias co="copilot /ollama"
alias cg="copilot /gdrive"
alias cs="copilot /status"

# Examples
cm list              # List models
co list              # List Ollama models
cg sync              # Sync to Google Drive
cs                   # Show status
```

## Troubleshooting Commands

```bash
# Reset all settings
/config reset

# Diagnose connection issues
/status --verbose

# Clear cache
/models cache clear

# Re-authenticate
/gdrive auth revoke
/gdrive setup

# View logs
/logs show --tail 50
```
