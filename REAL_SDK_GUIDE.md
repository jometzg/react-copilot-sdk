# Use Real Copilot SDK

This guide explains how to integrate the actual GitHub Copilot SDK.

## Prerequisites

1. Node 18+ or 20+ (20+ recommended for Azure packages)
2. Azure subscription with Copilot API access
3. Proper authentication configured (Managed Identity, service principal, or `az login`)

## Installation

### Step 1: Install SDK packages

```bash
cd backend
npm install @github/copilot-sdk @azure/identity
```

### Step 2: Update backend/package.json

The service already has dynamic SDK loading. No code changes needed—just:

```bash
export USE_COPILOT_SDK=true
npm run dev
```

### Step 3: Authentication

The service uses `DefaultAzureCredential` from `@azure/identity`, which checks in order:

1. Environment variables (`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`)
2. Managed Identity (if running in Azure)
3. `az login` credentials (local dev)
4. Azure CLI default account

### Step 4: Start backend

```bash
export USE_COPILOT_SDK=true
npm run dev
```

Watch for logs like:
- Success: `Backend listening on http://localhost:3001`
- SDK errors: `Copilot SDK error, falling back to mock` (gracefully degrades)

## Testing

1. Start backend with real SDK enabled
2. In a new terminal, start frontend:
   ```bash
   cd frontend
   npm run dev
   ```
3. Open `http://localhost:5173`
4. Upload a CSV and invoke an agent
5. Response streams from actual Copilot SDK

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Cannot find module @github/copilot-sdk" | Package not installed | `npm install @github/copilot-sdk` |
| "DefaultAzureCredential not found" | Azure auth not installed | `npm install @azure/identity` |
| "Falling back to mock" | Auth failed, SDK unavailable | Check Azure credentials with `az account show` |
| Slow initial responses | SDK warm-up time | Expected on first requests |

## Advanced: Custom Agent Instructions

Agents in `.github/agents/*.json` have an `instructions` field that is sent to Copilot:

```json
{
  "id": "custom-qa",
  "name": "QA Analyzer",
  "description": "Analyzes CSV for data quality",
  "instructions": "Review the CSV for NULL values, duplicates, and anomalies. Provide a scored data quality report."
}
```

The service concatenates agent instructions + CSV file content and sends to Copilot.

## Optional: Enable Streaming from SDK

Current implementation uses `sendAndWait()`. To enable streaming:

1. In `backend/src/services/copilotService.ts`, change:
   ```typescript
   const response = await session.sendAndWait({ userMessage });
   ```
   To:
   ```typescript
   for await (const chunk of session.send({ userMessage })) {
     // Emit chunk to SSE stream
   }
   ```

2. Emit chunks via `streamHub.publish()` for real-time UI updates

Contact GitHub support if you need streaming examples or SDK documentation.
