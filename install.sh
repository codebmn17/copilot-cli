#!/usr/bin/env bash
set -e

# GitHub Copilot CLI Installation Script
# Usage: curl -fsSL https://gh.io/copilot-install | bash
#    or: wget -qO- https://gh.io/copilot-install | bash
# Use | sudo bash to run as root and install to /usr/local/bin
# Export PREFIX to install to $PREFIX/bin/ directory (default: /usr/local for
# root, $HOME/.local for non-root), e.g., export PREFIX=$HOME/custom to install
# to $HOME/custom/bin

echo "Installing GitHub Copilot CLI..."

# Detect platform
case "$(uname -s || echo "")" in
  Darwin*) PLATFORM="darwin" ;;
  Linux*) PLATFORM="linux" ;;
  *)
    if command -v winget >/dev/null 2>&1; then
      echo "Windows detected. Installing via winget..."
      winget install GitHub.Copilot
      exit $?
    else
      echo "Error: Windows detected but winget not found. Please see https://gh.io/install-copilot-readme" >&2
      exit 1
    fi
    ;;
esac

# Detect architecture
case "$(uname -m)" in
  x86_64|amd64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Error: Unsupported architecture $(uname -m)" >&2 ; exit 1 ;;
esac

# Determine download URL based on VERSION
if [ -n "$VERSION" ]; then
  # Prefix version with 'v' if not already present
  case "$VERSION" in
    v*) ;;
    *) VERSION="v$VERSION" ;;
  esac
  DOWNLOAD_URL="https://github.com/github/copilot-cli/releases/download/${VERSION}/copilot-${PLATFORM}-${ARCH}.tar.gz"
  CHECKSUMS_URL="https://github.com/github/copilot-cli/releases/download/${VERSION}/SHA256SUMS.txt"
else
  DOWNLOAD_URL="https://github.com/github/copilot-cli/releases/latest/download/copilot-${PLATFORM}-${ARCH}.tar.gz"
  CHECKSUMS_URL="https://github.com/github/copilot-cli/releases/latest/download/SHA256SUMS.txt"
fi
echo "Downloading from: $DOWNLOAD_URL"

# Download and extract with error handling
TMP_DIR="$(mktemp -d)"
TMP_TARBALL="$TMP_DIR/copilot-${PLATFORM}-${ARCH}.tar.gz"
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$DOWNLOAD_URL" -o "$TMP_TARBALL"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$TMP_TARBALL" "$DOWNLOAD_URL"
else
  echo "Error: Neither curl nor wget found. Please install one of them."
  rm -rf "$TMP_DIR"
  exit 1
fi

# Attempt to download checksums file and validate
TMP_CHECKSUMS="$TMP_DIR/SHA256SUMS.txt"
CHECKSUMS_AVAILABLE=false
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$CHECKSUMS_URL" -o "$TMP_CHECKSUMS" 2>/dev/null && CHECKSUMS_AVAILABLE=true
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$TMP_CHECKSUMS" "$CHECKSUMS_URL" 2>/dev/null && CHECKSUMS_AVAILABLE=true
fi

if [ "$CHECKSUMS_AVAILABLE" = true ]; then
  if command -v sha256sum >/dev/null 2>&1; then
    if (cd "$TMP_DIR" && sha256sum -c --ignore-missing SHA256SUMS.txt >/dev/null 2>&1); then
      echo "✓ Checksum validated"
    else
      echo "Error: Checksum validation failed." >&2
      rm -rf "$TMP_DIR"
      exit 1
    fi
  elif command -v shasum >/dev/null 2>&1; then
    if (cd "$TMP_DIR" && shasum -a 256 -c --ignore-missing SHA256SUMS.txt >/dev/null 2>&1); then
      echo "✓ Checksum validated"
    else
      echo "Error: Checksum validation failed." >&2
      rm -rf "$TMP_DIR"
      exit 1
    fi
  else
    echo "Warning: No sha256sum or shasum found, skipping checksum validation."
  fi
fi

# Check that the file is a valid tarball
if ! tar -tzf "$TMP_TARBALL" >/dev/null 2>&1; then
  echo "Error: Downloaded file is not a valid tarball or is corrupted." >&2
  rm -rf "$TMP_DIR"
  exit 1
fi

# Check if running as root, fallback to non-root
if [ "$(id -u 2>/dev/null || echo 1)" -eq 0 ]; then
  PREFIX="${PREFIX:-/usr/local}"
else
  PREFIX="${PREFIX:-$HOME/.local}"
fi
INSTALL_DIR="$PREFIX/bin"
if ! mkdir -p "$INSTALL_DIR"; then
  echo "Error: Could not create directory $INSTALL_DIR. You may not have write permissions." >&2
  echo "Try running this script with sudo or set PREFIX to a directory you own (e.g., export PREFIX=\$HOME/.local)." >&2
  exit 1
fi

# Install binary
if [ -f "$INSTALL_DIR/copilot" ]; then
  echo "Notice: Replacing copilot binary found at $INSTALL_DIR/copilot."
fi
tar -xz -C "$INSTALL_DIR" -f "$TMP_TARBALL"
chmod +x "$INSTALL_DIR/copilot"
echo "✓ GitHub Copilot CLI installed to $INSTALL_DIR/copilot"
rm -rf "$TMP_DIR"

# Check if install directory is in PATH
PATH_ADDED=false
SHELL_RC=""

# Determine shell RC file for macOS users
if [ "$PLATFORM" = "darwin" ]; then
  if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "/bin/zsh" ] || [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
  elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_RC="$HOME/.bash_profile"
  elif [ -f "$HOME/.bashrc" ]; then
    SHELL_RC="$HOME/.bashrc"
  else
    SHELL_RC="$HOME/.zshrc"
  fi
fi

case ":$PATH:" in
  *":$INSTALL_DIR:"*) 
    echo "✓ $INSTALL_DIR is already in your PATH"
    ;;
  *)
    echo ""
    echo "Warning: $INSTALL_DIR is not in your PATH"
    
    # Auto-add to PATH on macOS if using default location
    if [ "$PLATFORM" = "darwin" ] && [ "$INSTALL_DIR" = "$HOME/.local/bin" ]; then
      # Check if PATH export already exists (more specific pattern)
      if ! grep -qE '^\s*export\s+PATH.*\.local/bin' "$SHELL_RC" 2>/dev/null; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
        echo "✓ Added $INSTALL_DIR to PATH in $SHELL_RC"
        PATH_ADDED=true
      fi
    else
      echo "Add it to your PATH by adding this line to your shell profile:"
      echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
    fi
    ;;
esac

# Optional: Try to install Python packages for enhanced features (macOS only)
if [ "$PLATFORM" = "darwin" ]; then
  echo ""
  echo "Checking for optional Python packages (Google Drive & Ollama support)..."
  
  # Check if pip is available
  if command -v pip3 >/dev/null 2>&1; then
    PYTHON_PACKAGES=("google-api-python-client" "google-auth-oauthlib")
    INSTALLED_COUNT=0
    
    for package in "${PYTHON_PACKAGES[@]}"; do
      if pip3 install --user "$package" >/dev/null 2>&1; then
        INSTALLED_COUNT=$((INSTALLED_COUNT + 1))
      fi
    done
    
    if [ $INSTALLED_COUNT -gt 0 ]; then
      echo "✓ Installed $INSTALLED_COUNT optional Python package(s)"
    fi
  else
    echo "⚠ pip3 not found - skipping optional Python packages"
    echo "  (This is fine! Core Copilot CLI works without them)"
    echo "  Python packages are only needed for Google Drive sync and Ollama integration"
  fi
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           ✓ Installation Complete!                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next Steps:"
if [ -n "$SHELL_RC" ]; then
  echo "  1. Reload your shell: source $SHELL_RC"
  if [ "$PATH_ADDED" = true ]; then
    echo "     (or open a new terminal window)"
  fi
else
  echo "  1. Reload your shell or open a new terminal window"
fi
echo "  2. Start Copilot CLI: copilot"
echo "  3. Authenticate: copilot auth login"
echo ""
if [ "$PLATFORM" = "darwin" ]; then
  echo "📖 For macOS-specific tips, see: MACOS_INSTALL.md"
  echo ""
fi
