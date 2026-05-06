# React Copilot SDK Frontend

A web application that integrates GitHub Copilot SDK with custom agent support, file processing, and real-time streaming responses.

## Overview

This project provides a React-based interface for running AI agents against uploaded files (currently CSV). Agents are loaded from `.github/agents/` and can perform custom analysis or transformations. Responses stream in real-time, and generated artifacts are available for download.

**Architecture:**
- **Frontend**: React 18 + TypeScript (Vite 5)
- **Backend**: Express 5 + TypeScript + Server-Sent Events (SSE) streaming
- **Agent Execution**: Mock implementation (real GitHub Copilot SDK integration pending)
- **File Storage**: In-memory with optional disk persistence for outputs

## Why This Is Useful

### 1. **Programmatic AI Access**
- Access Copilot capabilities without VS Code
- Integrate Copilot into web applications and dashboards
- Build custom workflows around AI analysis

### 2. **Custom Agents**
- Define domain-specific agents for your workflow (data analysis, code review, quality audits)
- Agents stored as simple JSON files—no complex setup
- Easy to add new agents without code changes

### 3. **Server-Side Execution**
- Credentials stay on the backend (not exposed to frontend)
- Process sensitive files securely
- Scalable—support multiple concurrent users

### 4. **Real-Time Streaming**
- Responses stream incrementally via Server-Sent Events
- Users see results as they arrive (not waiting for full completion)
- Better UX for long-running analyses

### 5. **Artifact Generation**
- Agents can generate downloadable files (reports, analyses, code)
- Session-based file organization
- Direct download from browser

### 6. **Self-Hosted & Cloud-Ready**
- Deploy to Azure App Service, Container Apps, or your own infrastructure
- No dependency on VS Code or IDE
- Works in any modern browser

### 7. **Batch Processing**
- Process multiple files programmatically
- Integrate with CI/CD pipelines
- Automate repetitive AI tasks

## Limitations vs. VS Code

### **Missing IDE Features**
| Feature | React Copilot | VS Code |
|---------|---|---|
| Code editing | ❌ None | ✅ Full editor |
| Syntax highlighting | ❌ No | ✅ 100+ languages |
| Debugging | ❌ No | ✅ Full debugger |
| Terminal integration | ❌ No | ✅ Integrated terminal |
| Git integration | ❌ No | ✅ Built-in source control |
| File tree navigation | ❌ Manual upload only | ✅ Full workspace browsing |
| Extensions | ❌ None | ✅ 50,000+ extensions |

### **Copilot Chat Differences**
| Capability | React Copilot | VS Code Copilot Chat |
|---|---|---|
| Context awareness | ⚠️ Limited (single file/upload) | ✅ Full workspace context |
| Multi-turn conversation | ⚠️ Single request/response | ✅ Full conversation history |
| Inline code actions | ❌ No | ✅ Yes (refactor, fix, etc.) |
| Symbol awareness | ❌ No | ✅ Understands codebase structure |
| Documentation integration | ❌ No | ✅ Integrated docs lookup |
| Quick-fix suggestions | ❌ No | ✅ Integrated quick fixes |

### **Functional Limitations**
- **File access**: Upload files manually (no workspace browsing)
- **Output context**: Agent sees only uploaded file + instructions (no codebase context)
- **Real-time code analysis**: No IDE-like "as-you-type" analysis
- **Persistence**: Sessions stored in memory (not suitable for high-volume production without database)
- **Auth**: No multi-user support out of box (requires additional backend work)
- **Scalability**: Single-instance only (clustering requires session store upgrade)

## Quick Start

### Prerequisites
- Node 18+ (20+ recommended for Azure packages)
- npm 9+

### Installation

```bash
# Clone and install
cd react-copilot
npm install

# Start both frontend and backend
npm run dev
```

Then:
- **Frontend**: http://localhost:5175
- **Backend API**: http://localhost:3001

### Create a Custom Agent

1. Create `.github/agents/my-agent.json`:
```json
{
  "id": "my-agent",
  "name": "My Custom Agent",
  "description": "Does something special",
  "instructions": "Analyze the CSV and provide [your instructions here]"
}
```

2. Restart backend—agent appears in dropdown automatically

3. Upload CSV and run agent

### Using the REST API

See [requests.http](requests.http) for a complete test suite with examples:

```bash
# List agents
curl http://localhost:3001/api/agents

# Upload CSV and run agent
curl -X POST \
  -F "file=@data.csv" \
  -F "agentId=csv-analyst" \
  http://localhost:3001/api/process

# Stream response events
curl http://localhost:3001/api/process/{SESSION_ID}/stream

# Download generated file
curl http://localhost:3001/api/process/{SESSION_ID}/files/{FILE_ID}/download
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Upload CSV → Select Agent → Run → Stream Response    │   │
│  │            ↓ Display Results ↓ Download Files        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/SSE
┌─────────────────────────────────────────────────────────────┐
│                  Express Backend (Node)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ POST /api/process      → Multer CSV upload           │   │
│  │ GET  /api/agents       → Load agents from filesystem │   │
│  │ GET  /:sessionId/stream → SSE real-time updates      │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Agent Execution Layer                        │   │
│  │  • Mock implementation (default)                     │   │
│  │  • Real GitHub Copilot SDK (pending availability)   │   │
│  │  • Fallback cascade on errors                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Session & File Management                    │   │
│  │  • Session store (in-memory with UUID)               │   │
│  │  • CSV upload parsing                                │   │
│  │  • Generated file storage                            │   │
│  │  • Stream pub/sub hub                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

Create `.env.local` in root or set directly:

```env
# Frontend
VITE_API_BASE=http://localhost:3001

# Backend
PORT=3001
FRONTEND_ORIGIN=http://localhost:5175
USE_COPILOT_SDK=false  # Set to true when SDK available
```

## Real SDK Integration

When `@github/copilot-sdk` becomes available on npm:

1. Install: `npm install @github/copilot-sdk @azure/identity`
2. Configure Azure auth (Managed Identity, service principal, or `az login`)
3. Set `USE_COPILOT_SDK=true`
4. Restart backend

See [REAL_SDK_GUIDE.md](REAL_SDK_GUIDE.md) for detailed setup.

## Development

### Build
```bash
npm run build              # Build both frontend and backend
npm run build -w backend   # Backend only
npm run build -w frontend  # Frontend only
```

### Run
```bash
npm run dev       # Start frontend + backend concurrently
npm start -w backend  # Production backend
```

### Test APIs
Install VS Code extension: [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)

Open [requests.http](requests.http) and click "Send Request" on any endpoint.

## Project Structure

```
react-copilot/
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main UI component
│   │   ├── App.css          # Styling
│   │   └── index.css        # Global styles
│   ├── package.json         # React + Vite config
│   └── tsconfig.json
│
├── backend/
│   ├── src/
│   │   ├── server.ts        # Express app entry
│   │   ├── types.ts         # Shared type definitions
│   │   ├── routes/
│   │   │   ├── agents.ts    # GET /api/agents
│   │   │   └── process.ts   # CSV upload, session, streaming
│   │   └── services/
│   │       ├── agentLoader.ts      # Load agents from filesystem
│   │       ├── copilotService.ts   # Agent execution (mock + real SDK)
│   │       ├── sessionStore.ts     # In-memory session management
│   │       ├── fileStore.ts        # CSV/output file handling
│   │       └── streamHub.ts        # SSE pub/sub
│   ├── package.json
│   └── tsconfig.json
│
├── .github/
│   └── agents/
│       ├── csv-analyst.json              # Sample agent
│       └── data-quality-auditor.json     # Sample agent
│
├── shared/
│   └── contracts.ts         # Shared types (for monorepo)
│
├── package.json             # Root workspace config
├── requests.http            # REST API test suite
├── COPILOT_SDK_SETUP.md    # SDK modes & configuration
├── REAL_SDK_GUIDE.md       # Real SDK integration guide
└── README.md               # This file
```

## Common Tasks

### Add a new agent
1. Create `.github/agents/my-agent.json`
2. Restart backend
3. Select in dropdown

### Deploy to Azure
```bash
npm run build
azd up  # Requires azd CLI setup
```

### Debug streaming
Check terminal logs when running `npm run dev`:
- `[Session xxx] Created...`
- `[Session xxx] Starting async processing...`
- `[StreamHub] Publishing...`

### View generated files
1. After agent runs, files appear in "3) Generated Files" section
2. Click "Download" to save locally
3. Or fetch via API: `GET /api/process/{SESSION_ID}/files/{FILE_ID}/download`

## Known Issues & Workarounds

| Issue | Cause | Workaround |
|-------|-------|-----------|
| "No agents found" in UI | Frontend can't reach backend | Check CORS settings in `backend/src/server.ts`, verify backend running on 3001 |
| No response/files after submit | EventSource subscribers not ready | 500ms delay added—if still missing, check browser console for SSE errors |
| SDK auth fails | Azure credentials not configured | Run `az login` or set `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` |
| Ports already in use | Previous instances still running | `pkill -f "npm run dev"` or restart system |

## Next Steps

- ✅ MVP complete with mock agents
- ⏳ Real GitHub Copilot SDK integration (awaiting npm package)
- 🔄 Multi-file upload support
- 🔄 Agent skill/tool framework
- 🔄 Database-backed session store
- 🔄 Multi-user with authentication
- 🔄 Agent parameters & configuration UI

## Support & Resources

- [GitHub Copilot SDK docs](https://github.com/github/copilot-sdk)
- [Azure Identity SDK](https://learn.microsoft.com/en-us/javascript/api/overview/azure/identity-readme)
- [Express.js](https://expressjs.com/)
- [React](https://react.dev/)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

## License

MIT
