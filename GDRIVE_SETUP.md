# Google Drive Setup Guide for GitHub Copilot CLI

This guide walks you through setting up Google Drive integration for backing up and syncing your Ollama models and trained models.

## Prerequisites

- Google Account
- Python 3.6+ installed
- Google Drive API credentials

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to APIs & Services > Enabled APIs & Services
4. Search for and enable:
   - **Google Drive API**
   - **Google Sheets API** (optional)

## Step 2: Create OAuth 2.0 Credentials

1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Desktop application"
4. Download the JSON file
5. Save as `~/.copilot/credentials.json`

```bash
# On Termux:
# Copy the credentials.json file to your home directory
ls -la ~/.copilot/credentials.json  # Verify it exists
```

## Step 3: Install Python Dependencies

```bash
# On Termux:
pip3 install --user google-auth-oauthlib google-auth-httplib2 google-api-python-client

# Or using system package manager:
pkg install python-google-auth
```

## Step 4: Set Up Copilot CLI

1. Start Copilot CLI:
```bash
copilot
```

2. Run setup command:
```
/gdrive setup
```

3. Follow the browser prompts to authorize access
4. The access token will be saved to `~/.copilot/gdrive-token.json`

## Step 5: Create Folder Structure in Google Drive

After setup, Copilot CLI will create this structure in your Google Drive:

```
copilot-models/
├── ollama-models/         # Ollama server models
│   ├── llama2/
│   ├── mistral/
│   └── neural-chat/
├── trained-models/        # Your fine-tuned models
│   ├── project-1/
│   ├── project-2/
│   └── training-data/
└── backups/               # Automatic backups
    ├── daily-2025-01-07/
    └── weekly-2025-01-06/
```

## Step 6: Configure Folder ID (Optional)

If you want to use an existing Google Drive folder:

1. Open your folder in Google Drive
2. Copy the folder ID from the URL: `...drive/folders/FOLDER_ID`
3. Add to `~/.copilot/config.json`:

```json
{
  "googleDrive": {
    "backupFolderId": "YOUR_FOLDER_ID_HERE",
    "autoSync": true
  }
}
```

## Usage Examples

### Basic Sync

```bash
# Sync models to Google Drive
/gdrive sync

# View sync status
/gdrive status

# Download models from Google Drive
/gdrive restore
```

### Manual Upload

```bash
# Upload specific model
/gdrive upload models/llama2

# Upload training data
/gdrive upload training-data/
```

### View Storage

```bash
# Check Google Drive storage quota
/gdrive storage

# See which files are synced
/gdrive list
```

### Configure Auto-Sync

Edit `~/.copilot/config.json`:

```json
{
  "googleDrive": {
    "enabled": true,
    "autoSync": true,
    "autoSyncInterval": 3600,
    "syncOnClose": true,
    "backupFolderId": "your-folder-id"
  }
}
```

## Scheduling Auto-Sync on Termux

Create a cron job to automatically sync models:

### Option 1: Using Termux scheduling

```bash
# Create sync script
cat > ~/.local/bin/sync-copilot.sh <<'EOF'
#!/bin/bash
export COPILOT_HOME=$HOME/.copilot
export GH_TOKEN="your-github-token"
copilot /gdrive sync
EOF

chmod +x ~/.local/bin/sync-copilot.sh
```

### Option 2: Using at command

```bash
# Sync at specific time
echo "~/.local/bin/sync-copilot.sh" | at 02:00

# List scheduled jobs
atq
```

## Troubleshooting

### Issue: "Credentials not found"

```bash
# Solution: Verify file exists
ls -la ~/.copilot/credentials.json

# If missing, download again from Google Cloud Console
```

### Issue: "Authentication failed"

```bash
# Remove old token and re-authenticate
rm ~/.copilot/gdrive-token.json
copilot /gdrive setup
```

### Issue: "Permission denied"

```bash
# Check file permissions
chmod 600 ~/.copilot/credentials.json
chmod 600 ~/.copilot/gdrive-token.json
```

### Issue: "Quota exceeded"

The Google Drive API has usage quotas. If you hit limits:

1. Wait 24 hours for quota reset
2. Or upgrade Google Cloud project
3. Consider using rsync instead (see below)

## Alternative: Using rsync Instead

For faster, more reliable syncing without API quotas:

```bash
# Install rsync on Termux
pkg install rsync

# Sync to remote server with rsync
rsync -avz --progress ~/.copilot/models/ user@remote:/backups/copilot-models/

# Sync from remote
rsync -avz --progress user@remote:/backups/copilot-models/ ~/.copilot/models/
```

## Sharing Models with Others

To share your models with other users:

1. Right-click folder in Google Drive > Share
2. Enter collaborator email
3. Choose "Editor" or "Viewer" role
4. They can download your models with their own Copilot CLI

## Security Best Practices

1. **Keep credentials safe**:
   ```bash
   chmod 600 ~/.copilot/credentials.json
   chmod 600 ~/.copilot/gdrive-token.json
   ```

2. **Use minimal permissions**:
   - Only grant Google Drive access (not Gmail, Contacts, etc.)

3. **Rotate credentials regularly**:
   ```bash
   # Every 3 months, generate new credentials in Google Cloud Console
   rm ~/.copilot/credentials.json ~/.copilot/gdrive-token.json
   # Download new credentials and re-run setup
   ```

4. **Monitor access**:
   - Check [Google Account Activity](https://myaccount.google.com/security)
   - Review connected apps regularly

## Advanced Configuration

### Custom Sync Schedule

Create `~/.copilot/sync-config.json`:

```json
{
  "schedule": {
    "enabled": true,
    "time": "02:00",
    "frequency": "daily",
    "daysOfWeek": ["Mon", "Wed", "Fri"],
    "syncDirection": "both"
  },
  "compression": {
    "enabled": true,
    "format": "tar.gz",
    "level": 6
  },
  "excludePatterns": [
    ".git",
    "*.log",
    "*.tmp",
    "node_modules"
  ]
}
```

### Bandwidth Limiting

For slow connections:

```bash
# In ~/.local/bin/sync-copilot.sh
rsync -avz --progress --bwlimit=500k ~/.copilot/models/ remote:/backup/
```

## Integration with CI/CD

If you want to backup models in GitHub Actions:

```yaml
# .github/workflows/backup-models.yml
name: Backup Models to Google Drive

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Python
        uses: actions/setup-python@v2
      - name: Install dependencies
        run: |
          pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client
      - name: Sync models
        env:
          GDRIVE_CREDENTIALS: ${{ secrets.GDRIVE_CREDENTIALS }}
        run: |
          echo "$GDRIVE_CREDENTIALS" > ~/.copilot/credentials.json
          copilot /gdrive sync
```

## More Information

- [Google Drive API Documentation](https://developers.google.com/drive)
- [GitHub Copilot CLI Docs](https://docs.github.com/copilot/concepts/agents/about-copilot-cli)
- [Termux Installation Guide](TERMUX_GUIDE.md)
