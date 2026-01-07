# GitHub Copilot CLI - Enhanced Architecture & Flow Diagrams

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    GitHub Copilot CLI (Main App)                     │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                      Command Processor                           │ │
│  │  /ollama | /gdrive | /models | /config | /status | /help       │ │
│  └────────┬────────────────┬──────────────┬────────────────────────┘ │
│           │                │              │                           │
└───────────┼────────────────┼──────────────┼───────────────────────────┘
            │                │              │
    ┌───────▼────┐    ┌──────▼──────┐    ┌─▼────────────────┐
    │   Ollama   │    │   Google    │    │  Model           │
    │   Client   │    │   Drive     │    │  Manager         │
    │            │    │   Manager   │    │                  │
    │ • list()   │    │             │    │ • pullModel()    │
    │ • pull()   │    │ • auth()    │    │ • trainModel()   │
    │ • generate │    │ • sync()    │    │ • export()       │
    │ • delete() │    │ • restore() │    │ • delete()       │
    │ • stream() │    │ • storage() │    │ • sync()         │
    └─────┬──────┘    └──────┬──────┘    └─────┬────────────┘
          │                   │                  │
          │                   └──────┬───────────┘
          │                          │
    ┌─────▼──────────────┐    ┌─────▼─────────────┐
    │  Local Ollama      │    │  Local Storage    │
    │  Server            │    │  & Google Drive   │
    │  (port 11434)      │    │  (Cloud Sync)     │
    └────────────────────┘    └───────────────────┘
```

---

## Data Flow Diagrams

### Pull Model Flow
```
User Input: /models pull llama2
        │
        ▼
ModelManager.pullModel("llama2")
        │
        ├─→ OllamaClient.checkHealth()
        │   └─→ Ollama Server (http://localhost:11434)
        │
        └─→ OllamaClient.pullModel("llama2")
            ├─→ POST /api/pull (with streaming)
            ├─→ Progress Events ──→ UI
            ├─→ Save to ~/.copilot/models/
            └─→ Update models.json metadata
```

### Sync to Google Drive Flow
```
User Input: /gdrive sync
        │
        ▼
ModelManager.syncToGoogleDrive(folderId)
        │
        ├─→ GoogleDriveManager.isAuthenticated()
        │
        ├─→ GoogleDriveManager.syncModels(folderId, {direction: 'both'})
        │   │
        │   ├─→ uploadDirectory(~/.copilot/models/)
        │   │   ├─→ Compress with tar.gz
        │   │   ├─→ POST to Google Drive API
        │   │   └─→ Progress Events ──→ UI
        │   │
        │   └─→ Update config.json (synced: true)
        │
        └─→ Event: 'sync-complete'
```

### Train Model Flow
```
User Input: /models train llama2 data.txt
        │
        ▼
ModelManager.trainModel("llama2", "data.txt")
        │
        ├─→ Validate base model exists
        │
        ├─→ Create training directory
        │   └─→ ~/.copilot/training/{trainingId}/
        │
        ├─→ Copy training data
        │
        ├─→ Save metadata to models.json
        │   ├─→ base_model: "llama2"
        │   ├─→ training_id: "xxx"
        │   ├─→ trained_at: timestamp
        │   └─→ synced: false
        │
        ├─→ Training Completion
        │
        └─→ Optional: Export & Sync
            ├─→ /models export {trainingId}
            └─→ /gdrive sync
```

---

## Component Interaction Diagram

```
                         ┌─────────────────┐
                         │   User/Terminal  │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  Copilot CLI    │
                         │   (Node.js)     │
                         └────────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
              ┌──────────┐  ┌──────────┐  ┌─────────────┐
              │ Ollama   │  │ Google   │  │ Model       │
              │ Client   │  │ Drive    │  │ Manager     │
              │ (Node.js)│  │ Manager  │  │             │
              │          │  │ (Node.js)│  │             │
              └────┬─────┘  └────┬─────┘  └──────┬──────┘
                   │             │                │
         ┌─────────▼─────────────▼────────────────▼─────────┐
         │                                                    │
         │          Configuration & Data Storage              │
         │   (~/.copilot/config.json, models.json, etc.)    │
         │                                                    │
         └─────────┬────────────────────────────────────────┘
                   │
        ┌──────────┴──────────────┐
        │                         │
        ▼                         ▼
    ┌─────────────┐         ┌──────────────┐
    │  Ollama     │         │  Google      │
    │  Server     │         │  Drive       │
    │  (Python)   │         │  (Cloud)     │
    │ Port 11434  │         │  API         │
    └─────────────┘         └──────────────┘
```

---

## Sequence Diagram: Google Drive Setup

```
User                 CLI              GoogleDriveManager        Google API
  │                  │                       │                      │
  ├─/gdrive setup───▶│                       │                      │
  │                  ├──authenticate()──────▶│                      │
  │                  │                       ├──OAuth2──────────────▶│
  │                  │                       │◀──auth_token──────────┤
  │                  │                       │                      │
  │                  │                       ├──create folder───────▶│
  │                  │                       │◀──folder_id──────────┤
  │                  │                       │                      │
  │                  │                       ├─create subfolder────▶│
  │                  │                       │◀──folder_id──────────┤
  │                  │                       │                      │
  │                  │◀──setup complete─────┤                      │
  │                  │                       │                      │
  │◀─Config saved────│                       │                      │
  │                  │                       │                      │
```

---

## Sequence Diagram: Model Training & Sync

```
User          ModelManager       OllamaClient      GoogleDrive      Storage
 │                │                  │                  │              │
 ├─/models pull──▶│                  │                  │              │
 │                ├─checkHealth()────▶│                  │              │
 │                ├─pullModel()──────▶│──POST /api/pull─▶│              │
 │                │                  │                  │◀─stream──────┐
 │                │◀─progress events─┤                  │         models/
 │                │                  │                  │              │
 │                │──save to disk────┤                  │◀─stream──────┤
 │                │──update config───┤                  │              │
 │                │                  │                  │              │
 │                │◀─complete────────┤                  │              │
 │                │                  │                  │              │
 ├─/models train ─▶│                  │                  │              │
 │                ├─create dir────────────────────────────────────────▶│
 │                │                  │                  │         training/
 │                ├─copy data────────────────────────────────────────▶│
 │                ├─update metadata──┤                  │              │
 │                │                  │                  │              │
 │                │◀─training id─────┤                  │              │
 │                │                  │                  │              │
 ├─/gdrive sync──▶│                  │                  │              │
 │                ├─syncModels()─────────────────────┐  │              │
 │                │                  │               ▼  │              │
 │                │                  │          API auth & upload       │
 │                │                  │               │  │              │
 │                │◀─sync complete───────────────────┘  │              │
 │                │──update synced flag───────────────────────────────▶│
 │                │                  │                  │              │
 │◀─complete──────│                  │                  │              │
 │                │                  │                  │              │
```

---

## Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                     Copilot CLI (Entry Point)                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    ┌─────────┐ ┌──────────┐ ┌────────────┐
    │ Ollama  │ │ Google   │ │ Model      │
    │ Client  │ │ Drive    │ │ Manager    │
    │         │ │ Manager  │ │            │
    │ • http  │ │ • python │ │ • fs       │
    │ • https │ │ • exec   │ │ • path     │
    │ • json  │ │ • json   │ │ • events   │
    │ • fs    │ │ • fs     │ │ • config   │
    └─────────┘ └──────────┘ └────────────┘
         │           │           │
         │           │           │
    ┌────┴───────────┴───────────┴────┐
    │                                  │
    │      Node.js Built-ins           │
    │  (http, https, fs, path, ...)    │
    │                                  │
    └──────────────────────────────────┘
         │           │           │
         ▼           ▼           ▼
    ┌─────────┐ ┌──────────┐ ┌────────────┐
    │ Ollama  │ │ Google   │ │ Local      │
    │ Server  │ │ Drive    │ │ File       │
    │         │ │ API      │ │ System     │
    └─────────┘ └──────────┘ └────────────┘
```

---

## Data Structure Diagram

### Configuration (`~/.copilot/config.json`)
```json
{
  "version": "1.0",
  "features": {
    "ollama": true,
    "googleDrive": true,
    "modelTraining": true
  },
  "storage": {
    "modelsPath": "~/.copilot/models",
    "trainingPath": "~/.copilot/training"
  },
  "ollama": {
    "host": "http://localhost:11434",
    "autoDownload": false,
    "models": ["llama2", "mistral"]
  },
  "googleDrive": {
    "enabled": true,
    "authenticated": true,
    "backupFolderId": "xxxxx",
    "autoSync": false,
    "autoSyncInterval": 3600
  }
}
```

### Models Metadata (`~/.copilot/models.json`)
```json
{
  "models": {
    "llama2:latest": {
      "source": "ollama",
      "pulledAt": "2025-01-07T10:30:00Z",
      "size": 3800000000,
      "synced": true,
      "syncedAt": "2025-01-07T10:35:00Z"
    },
    "custom-trained": {
      "source": "trained",
      "baseModel": "llama2",
      "trainingId": "train_xxx_123",
      "trainedAt": "2025-01-07T11:00:00Z",
      "synced": false
    }
  },
  "settings": {
    "overwriteModels": false
  },
  "gdrive": {
    "authenticated": true,
    "backupFolderId": "folder_id",
    "setupAt": "2025-01-01T00:00:00Z"
  }
}
```

---

## Storage Hierarchy

```
Home Directory (~/)
│
└─ .copilot/                          # Copilot Home
   │
   ├─ config.json                     # Main configuration
   ├─ models.json                     # Models metadata
   ├─ credentials.json                # Google OAuth credentials
   ├─ gdrive-token.json               # Google access token
   │
   ├─ models/                         # Downloaded models
   │   ├─ llama2_latest/
   │   ├─ mistral_latest/
   │   └─ neural-chat_latest/
   │
   ├─ training/                       # Training data & results
   │   ├─ train_xxx_001/
   │   │   ├─ training-data.txt
   │   │   ├─ config.json
   │   │   └─ checkpoints/
   │   └─ train_xxx_002/
   │
   ├─ skills/                         # Custom skills (optional)
   │
   ├─ cache/                          # Temporary cache
   │   └─ models/
   │
   └─ logs/                           # Debug logs
       └─ copilot.log
```

---

## Command Routing

```
Raw Input: /models pull llama2
     │
     ▼
Command Parser
     │
     ├─ Identify: /models
     ├─ Action: pull
     └─ Args: [llama2]
     │
     ▼
Route Handler
     │
     ├─ Load ModelManager
     │
     ├─ Call: manager.pullModel("llama2")
     │
     ├─ Setup Event Listeners
     │   ├─ 'pull-start'
     │   ├─ 'pull-progress'
     │   └─ 'pull-complete'
     │
     ▼
Output to User
     │
     ├─ Progress updates
     ├─ Status messages
     └─ Completion confirmation
```

---

## Event Flow

```
┌─────────────────────────────────────────┐
│         Model Pull Operation             │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    emit('pull-start', {...})             │
│    └─ Show starting message              │
└────────────┬────────────────────────────┘
             │
             ▼
         [Loop]
         ┌─────────────────────────────────┐
         │ emit('pull-progress', {...})    │
         │ └─ Update progress bar           │
         └────────────┬────────────────────┘
                      │
                      ├─ repeat N times
                      │
                      ▼
                   [Done]
             │
             ▼
┌─────────────────────────────────────────┐
│   emit('pull-complete', {...})           │
│   └─ Show success message                │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Update config & return result          │
└─────────────────────────────────────────┘
```

---

## Authentication Flow

```
┌──────────────────────────────────────┐
│  User: /gdrive setup                 │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Check credentials.json exists       │
└────────┬─────────────────────────────┘
         │
    ┌────┴────┐
    │          │
   YES        NO
    │          │
    │          ▼
    │      ┌──────────────────────────┐
    │      │ Prompt user to download  │
    │      │ credentials from Google  │
    │      │ Cloud Console            │
    │      └────────┬─────────────────┘
    │              │
    │              ▼
    │      ┌──────────────────────────┐
    │      │ User saves to            │
    │      │ ~/.copilot/credentials   │
    │      └────────┬─────────────────┘
    │              │
    └──────┬───────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Python Script: OAuth2 Flow          │
│  - Open browser                      │
│  - User consents                     │
│  - Get access token                  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Save token to                       │
│  ~/.copilot/gdrive-token.json        │
│  (chmod 600)                         │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Create folder structure on Drive    │
│  - copilot-models/                   │
│  - ollama-models/                    │
│  - trained-models/                   │
│  - backups/                          │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Save config.json with folderId      │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Setup Complete! ✓                   │
└──────────────────────────────────────┘
```

---

## Error Handling Flow

```
Operation Initiated
     │
     ▼
Try/Catch Block
     │
  ┌──┴──┐
  │     │
 OK    Error
  │     │
  │     ▼
  │  Check Error Type
  │     │
  │  ┌──┴──┬───────┬──────────┐
  │  │     │       │          │
  │  │     │       │     Network?
  │  │     │       │          │
  │  │     │     IO?      Retry
  │  │     │       │
  │  │   Auth?
  │  │     │
  │  ├─────┤
  │  │     │
  │  │   emit('error', {...})
  │  │     │
  │  │  Log error
  │  │     │
  │  ▼
  └─▶ Return to user
      with error message
```

---

## Performance Optimization Flow

```
User Command: /gdrive sync --compress
        │
        ▼
ModelManager.syncModels(folderId, {
  compress: true,
  direction: 'both'
})
        │
        ├─ Check available disk space
        │
        ├─ Get models list (small overhead)
        │
        ├─ Compress files
        │   ├─ tar.gz (20% size reduction)
        │   ├─ Parallel processing
        │   └─ Progress events
        │
        ├─ Upload to Google Drive
        │   ├─ Resumable upload
        │   ├─ Bandwidth limiting
        │   └─ Retry on failure
        │
        └─ Verify & Update
            └─ Set synced flag
```

---

This architecture is designed to be:
- **Modular**: Each component has a single responsibility
- **Scalable**: Easy to add new features
- **Reliable**: Error handling throughout
- **Efficient**: Optimized for mobile and desktop
- **User-Friendly**: Clear command flow and feedback

