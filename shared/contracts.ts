export type SessionStatus = "queued" | "processing" | "completed" | "error";

export type AgentSummary = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  sourcePath: string;
};

export type OutputFile = {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type ProcessSession = {
  sessionId: string;
  agentId: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  inputFileName: string;
  responseText: string;
  outputFiles: OutputFile[];
  error?: string;
};
