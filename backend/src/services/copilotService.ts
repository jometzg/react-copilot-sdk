let CopilotClient: any;
let DefaultAzureCredential: any;
let DEFAULT_CHAT_MODEL: string;

try {
  const copilotModule = require("@github/copilot-sdk");
  CopilotClient = copilotModule.CopilotClient;
  DEFAULT_CHAT_MODEL = copilotModule.DEFAULT_CHAT_MODEL || "gpt-4";
} catch {
  // SDK not available, will use mock
  CopilotClient = null;
}

try {
  const identityModule = require("@azure/identity");
  DefaultAzureCredential = identityModule.DefaultAzureCredential;
} catch {
  // Azure SDK not available, will use mock
  DefaultAzureCredential = null;
}

import type { AgentSummary } from "../types";

export type CopilotRunResult = {
  responseText: string;
  generatedFile?: {
    fileName: string;
    content: string;
  };
};

let clientInstance: any = null;

function getCopilotClient(): any {
  if (!CopilotClient || !DefaultAzureCredential) {
    throw new Error("Copilot SDK dependencies not available");
  }

  if (clientInstance) {
    return clientInstance;
  }

  const credential = new DefaultAzureCredential();
  clientInstance = new CopilotClient({ credential });
  return clientInstance;
}

function summarizeCsv(csvText: string): { rows: number; columns: number } {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    return { rows: 0, columns: 0 };
  }

  const columns = lines[0].split(",").length;
  return {
    rows: Math.max(lines.length - 1, 0),
    columns,
  };
}

async function runMockAgent(agent: AgentSummary, csvText: string): Promise<CopilotRunResult> {
  const stats = summarizeCsv(csvText);
  const responseText = [
    `Agent ${agent.name} processed your CSV.`,
    `Rows: ${stats.rows}`,
    `Columns: ${stats.columns}`,
    "Suggested next step: inspect data quality and missing values.",
  ].join("\n");

  const generatedFile = {
    fileName: "analysis.txt",
    content: [
      `Agent ID: ${agent.id}`,
      `Agent Name: ${agent.name}`,
      `Rows: ${stats.rows}`,
      `Columns: ${stats.columns}`,
      "",
      "Preview (first 5 lines):",
      ...csvText.split(/\r?\n/).slice(0, 5),
    ].join("\n"),
  };

  return { responseText, generatedFile };
}

async function runRealCopilotAgent(agent: AgentSummary, csvText: string): Promise<CopilotRunResult> {
  if (!CopilotClient || !DefaultAzureCredential) {
    throw new Error("Copilot SDK not available");
  }

  const client = getCopilotClient();

  const userMessage = [
    agent.instructions,
    "",
    "CSV Data:",
    csvText,
  ].join("\n");

  try {
    const session = await client.createSession({
      model: DEFAULT_CHAT_MODEL,
    });

    const response = await session.sendAndWait({
      userMessage,
    });

    const responseText = response.text || "";

    const generatedFile = {
      fileName: `${agent.id}-analysis.txt`,
      content: [
        `Agent: ${agent.name}`,
        `ID: ${agent.id}`,
        `Generated: ${new Date().toISOString()}`,
        "",
        "Response:",
        responseText,
      ].join("\n"),
    };

    return { responseText, generatedFile };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Copilot SDK error, falling back to mock:", error);
    return runMockAgent(agent, csvText);
  }
}

export async function runCopilotAgent(agent: AgentSummary, csvText: string): Promise<CopilotRunResult> {
  const useRealSdk = process.env.USE_COPILOT_SDK === "true";

  if (useRealSdk) {
    try {
      return await runRealCopilotAgent(agent, csvText);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Real SDK failed, using mock:", error);
      return runMockAgent(agent, csvText);
    }
  }

  return runMockAgent(agent, csvText);
}
