# Package Dependencies for Extended Features

Add these dependencies to your `package.json` to support the new Ollama and Google Drive features.

## Installation

```bash
npm install
```

## Required Dependencies

```json
{
  "dependencies": {
    "@github/copilot": "latest",
    "google-auth-oauthlib": "^1.0.0",
    "google-auth-httplib2": "^0.2.0",
    "google-api-python-client": "^2.80.0"
  },
  "devDependencies": {
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  },
  "engines": {
    "node": ">=14.0.0",
    "npm": ">=6.0.0"
  }
}
```

## Python Dependencies

For Google Drive and advanced Ollama features, install Python packages:

### Using pip (Linux/macOS/Termux)

```bash
pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

### Using pip3 on Termux

```bash
pip3 install --user google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

### Optional: Advanced ML Support

For model training and fine-tuning:

```bash
pip install torch transformers datasets accelerate
```

## Termux-Specific Setup

```bash
# Update package manager
pkg update && pkg upgrade

# Install system dependencies
pkg install python nodejs git curl wget openssl

# Install Node.js packages
npm install -g @github/copilot

# Install Python packages
pip3 install --user \
  google-auth-oauthlib \
  google-auth-httplib2 \
  google-api-python-client
```

## Verification

After installation, verify everything is working:

```bash
# Check Node.js
node --version
npm --version

# Check Python
python3 --version
pip3 list | grep google

# Check Copilot CLI
copilot --version

# Test connection
copilot /status
```

## Troubleshooting Installation

### Issue: Module not found

```bash
# Clear cache and reinstall
npm cache clean --force
npm install -g @github/copilot@latest
```

### Issue: Python packages missing

```bash
# Upgrade pip and reinstall
pip3 install --upgrade pip
pip3 install --user --upgrade google-auth-oauthlib
```

### Issue: Permission denied on Termux

```bash
# Use --user flag for pip
pip3 install --user package-name

# Or set npm prefix
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

## Updating Dependencies

To update all packages to latest versions:

```bash
# Node.js
npm update -g @github/copilot

# Python
pip3 install --user --upgrade google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

## Production Deployment

For production use on servers:

```bash
# Install with specific version
npm install -g @github/copilot@0.0.374

# Verify installation
copilot --version

# Set up service user
useradd -m -s /bin/bash copilot-user
```

## Development Environment

If you're contributing to the project:

```bash
# Clone and install
git clone https://github.com/github/copilot-cli.git
cd copilot-cli
npm install
npm run build

# Run tests
npm test

# Run linter
npm run lint
```

## Docker Support (Optional)

For containerized deployment:

```dockerfile
FROM node:18-alpine

# Install Python and build tools
RUN apk add --no-cache python3 py3-pip

# Install Node packages
RUN npm install -g @github/copilot

# Install Python packages
RUN pip3 install google-auth-oauthlib google-auth-httplib2 google-api-python-client

# Create user
RUN useradd -m copilot

USER copilot
WORKDIR /home/copilot

ENTRYPOINT ["copilot"]
```

Build and run:

```bash
docker build -t copilot-cli .
docker run -it --rm copilot-cli
```
