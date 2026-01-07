#!/usr/bin/env bash
# GitHub Copilot CLI - Termux Optimized Installation Script
# Usage: curl -fsSL <url> | bash
#        chmod +x termux-install.sh && ./termux-install.sh

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  GitHub Copilot CLI - Termux Installation                 ║"
echo "║  Optimized for Android/Termux with Ollama & Google Drive   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Detect if running in Termux
if [ ! -d "$TERMUX_PREFIX" ] && [ -z "$TERMUX_VERSION" ]; then
  echo "⚠️  Warning: This script is optimized for Termux but may work on other systems."
  echo "   Continue? (y/n)"
  read -r response
  if [ "$response" != "y" ]; then
    exit 1
  fi
fi

# Check prerequisites
echo "Checking prerequisites..."
MISSING_DEPS=()

for cmd in git curl wget python node; do
  if ! command -v "$cmd" &> /dev/null; then
    MISSING_DEPS+=("$cmd")
  fi
done

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
  echo "❌ Missing dependencies: ${MISSING_DEPS[*]}"
  echo ""
  echo "Install with Termux:"
  echo "  pkg update && pkg upgrade"
  echo "  pkg install nodejs python git curl wget openssl"
  exit 1
fi

echo "✓ All prerequisites found"
echo ""

# Set installation directory
if [ -z "$PREFIX" ]; then
  PREFIX="${TERMUX_PREFIX:-$HOME/.local}"
fi
INSTALL_DIR="$PREFIX/bin"

# Create installation directory
mkdir -p "$INSTALL_DIR"

# Create Copilot home directory
COPILOT_HOME="${COPILOT_HOME:-$HOME/.copilot}"
mkdir -p "$COPILOT_HOME"/{models,training,skills}

echo "Installation Settings:"
echo "  Installation Directory: $INSTALL_DIR"
echo "  Copilot Home: $COPILOT_HOME"
echo ""

# Install Node.js dependencies
echo "Installing Copilot CLI via npm..."
npm install -g @github/copilot 2>&1 | tail -5

# Install optional Python dependencies for enhanced features
echo ""
echo "Installing optional Python packages for Google Drive & Ollama support..."

PYTHON_PACKAGES=(
  "google-auth-oauthlib"
  "google-auth-httplib2"
  "google-api-python-client"
)

for package in "${PYTHON_PACKAGES[@]}"; do
  if pip3 install --user "$package" 2>/dev/null; then
    echo "  ✓ $package"
  else
    echo "  ⚠ Could not install $package (optional)"
  fi
done

echo ""

# Create configuration files
echo "Setting up configuration files..."

# Create .bashrc additions if needed
if ! grep -q "COPILOT_HOME" "$HOME/.bashrc" 2>/dev/null; then
  cat >> "$HOME/.bashrc" <<'EOF'

# GitHub Copilot CLI Configuration
export COPILOT_HOME="$HOME/.copilot"
export NODE_OPTIONS="--max-old-space-size=512"
export OLLAMA_HOST="http://localhost:11434"
export PATH="$HOME/.local/bin:$PATH"

# Alias for quick access
alias copilot-models="copilot /models"
alias copilot-gdrive="copilot /gdrive"
alias copilot-ollama="copilot /ollama"
EOF
  echo "  ✓ Updated ~/.bashrc"
fi

# Create configuration template
if [ ! -f "$COPILOT_HOME/config.json" ]; then
  cat > "$COPILOT_HOME/config.json" <<'EOF'
{
  "version": "1.0",
  "features": {
    "ollama": true,
    "googleDrive": true,
    "modelTraining": true
  },
  "storage": {
    "modelsPath": "$HOME/.copilot/models",
    "trainingPath": "$HOME/.copilot/training",
    "cachePath": "$HOME/.copilot/cache"
  },
  "ollama": {
    "host": "http://localhost:11434",
    "autoDownload": false,
    "models": []
  },
  "googleDrive": {
    "enabled": false,
    "credentialsPath": "$HOME/.copilot/credentials.json",
    "backupFolderId": null,
    "autoSync": false
  },
  "performance": {
    "maxMemory": 512,
    "useCompression": true,
    "cacheModels": true
  }
}
EOF
  echo "  ✓ Created $COPILOT_HOME/config.json"
fi

# Create quick start guide
cat > "$COPILOT_HOME/QUICKSTART.md" <<'EOF'
# GitHub Copilot CLI - Quick Start

## Basic Usage
```bash
copilot                    # Start interactive session
copilot /help             # Show available commands
copilot /model            # Change AI model
```

## Ollama Integration
```bash
# Pull a model from Ollama server
copilot /ollama pull llama2

# List available models
copilot /ollama list

# Generate text using a model
copilot /ollama generate "What is AI?" --model llama2
```

## Google Drive Setup
```bash
# First time setup
copilot /gdrive setup

# Sync models to Google Drive
copilot /gdrive sync

# Download models from Google Drive
copilot /gdrive restore
```

## Model Management
```bash
# List all models
copilot /models list

# Pull model from Ollama
copilot /models pull llama2

# Train on local data
copilot /models train llama2 training-data.txt

# Export trained model
copilot /models export <training-id>

# Check storage usage
copilot /models storage
```

## Authentication
```bash
# Login with GitHub
copilot /login

# Or set personal access token
export GH_TOKEN="your_token_here"
```

## Performance Tips for Termux
1. Close background apps before using Copilot CLI
2. Use smaller models (neural-chat vs llama2)
3. Sync during WiFi connections
4. Check storage regularly with `/models storage`

## Troubleshooting
- Check logs: `$HOME/.copilot/logs/`
- Reset config: `rm $HOME/.copilot/config.json`
- See full guide: [TERMUX_GUIDE.md](../TERMUX_GUIDE.md)

For more information, run `copilot /help` or visit the docs.
EOF
  echo "  ✓ Created QUICKSTART.md"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           ✓ Installation Complete!                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next Steps:"
echo "  1. Reload your shell: source ~/.bashrc"
echo "  2. Start Copilot CLI: copilot"
echo "  3. Login with: /login"
echo "  4. Read quick start: cat $COPILOT_HOME/QUICKSTART.md"
echo ""
echo "Optional Setup:"
echo "  - Ollama: Install on your main machine and expose the API"
echo "  - Google Drive: Run 'copilot /gdrive setup' for cloud sync"
echo ""
echo "Documentation:"
echo "  - Full Termux Guide: https://github.com/github/copilot-cli/blob/main/TERMUX_GUIDE.md"
echo "  - Official Docs: https://docs.github.com/copilot/concepts/agents/about-copilot-cli"
echo ""
