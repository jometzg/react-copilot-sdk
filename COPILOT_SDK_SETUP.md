# Copilot SDK Integration

## Overview

The backend service has two operational modes:

1. **Mock Mode** (default): Simulates agent processing locally for development
2. **Real SDK Mode**: Uses GitHub Copilot SDK for actual agent execution

## Setup

### Development (Mock Mode)

Default behavior—no additional setup required. The app works immediately with mock agents.

```bash
cd backend
npm run dev
```

### Production (Real SDK Mode)

To use the actual Copilot SDK:

1. **Install SDK packages** (when available in npm):
   ```bash
   npm install @github/copilot-sdk @azure/identity
   ```

2. **Configure authentication**:
   - **Azure deployment**: Set up Azure Managed Identity or service principal
   - **Local development**: Use `az login` to authenticate via Azure CLI

3. **Enable real SDK**:
   ```bash
   export USE_COPILOT_SDK=true
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the backend folder:

```env
# Enable real Copilot SDK (default: false)
USE_COPILOT_SDK=false

# Frontend origin for CORS (default: http://localhost:5173)
FRONTEND_ORIGIN=http://localhost:5173

# Backend port (default: 3001)
PORT=3001
```

## SDK Behavior

- **If `USE_COPILOT_SDK=false`**: Uses mock agent that parses CSV and returns simulated analysis
- **If `USE_COPILOT_SDK=true`**: Calls Copilot SDK
  - On success: Returns actual agent response from Copilot
  - On failure: Automatically falls back to mock mode with console warning

This ensures the app never crashes—it always has a working fallback.

## API Usage

All endpoints remain identical regardless of mode:

```bash
# List agents from .github/agents
curl http://localhost:3001/api/agents

# Upload CSV and invoke agent
curl -X POST \
  -F "file=@data.csv" \
  -F "agentId=csv-analyst" \
  http://localhost:3001/api/process

# Stream response events
curl http://localhost:3001/api/process/{sessionId}/stream
```

## Custom Agents

Add new agents by creating JSON files in `.github/agents/`:

```json
{
  "id": "my-agent",
  "name": "My Custom Agent",
  "description": "Does something special",
  "instructions": "Analyze the CSV and provide..."
}
```

Agents are auto-discovered on every backend restart.
