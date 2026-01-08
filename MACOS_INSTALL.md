# macOS Installation Guide

## Quick Install (Recommended)

Install GitHub Copilot CLI using the official install script:

```bash
curl -fsSL https://gh.io/copilot-install | bash
```

**Note:** The install script automatically adds `~/.local/bin` to your PATH in `~/.zshrc` (or `.bash_profile`/`.bashrc` if you use bash). If the automatic PATH setup doesn't work for your shell configuration, you can add it manually:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Verify Installation

```bash
copilot --help
copilot auth login
```

## Alternative Installation Methods

### Using Homebrew

```bash
brew install copilot-cli
```

### Using npm

```bash
npm install -g @github/copilot
```

## Optional: Google Drive & Ollama Support

If you want the extra features, install Python packages:

```bash
pip3 install google-api-python-client google-auth-oauthlib
```

**Note:** These Python packages are completely optional. The core Copilot CLI works perfectly without them. They're only needed for:
- Google Drive model sync
- Ollama local model integration

## Troubleshooting

### "pip: command not found" or "No module named pip"

This is fine! The core Copilot CLI works without pip. The Python packages are only needed for Google Drive sync and Ollama integration.

If you want to install pip:

```bash
# Using Homebrew
brew install python3

# Or download from python.org
# https://www.python.org/downloads/macos/
```

### PATH issues

Make sure `~/.local/bin` is in your PATH:

```bash
echo $PATH | grep -q '.local/bin' || echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Permission Denied

If you get permission errors during installation:

```bash
# Install to your home directory (default for non-root)
curl -fsSL https://gh.io/copilot-install | bash

# Or install system-wide (requires sudo)
curl -fsSL https://gh.io/copilot-install | sudo bash
```

### Proxy Errors

If you're behind a corporate proxy:

```bash
# Set proxy environment variables
export HTTP_PROXY="http://your-proxy:port"
export HTTPS_PROXY="http://your-proxy:port"

# Then run installation
curl -fsSL https://gh.io/copilot-install | bash
```

## What Gets Installed

The installation script:
1. Downloads the latest Copilot CLI binary for macOS
2. Validates the checksum for security
3. Installs to `~/.local/bin` (or `/usr/local/bin` if run with sudo)
4. Makes the binary executable

## Next Steps

After installation:

1. **Authenticate with GitHub:**
   ```bash
   copilot
   copilot auth login
   ```

2. **Choose your AI model:**
   ```bash
   copilot
   /model
   ```

3. **Start coding:**
   ```bash
   cd your-project
   copilot
   ```

## Full Documentation

- [Official GitHub Copilot CLI Documentation](https://docs.github.com/copilot/concepts/agents/about-copilot-cli)
- [Main README](README.md)
- [Termux Installation Guide](TERMUX_GUIDE.md) (for Android users)

## Support

For issues or questions:
- Open an issue on [GitHub](https://github.com/codebmn17/copilot-cli/issues)
- Check [official documentation](https://docs.github.com/copilot/concepts/agents/about-copilot-cli)
- Run `/feedback` from the CLI to submit feedback
