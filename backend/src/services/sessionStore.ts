import { randomUUID } from "node:crypto";

import type { OutputFile, ProcessSession, SessionStatus } from "../types";

const sessions = new Map<string, ProcessSession>();

function nowIso(): string {
  return new Date().toISOString();
}

export function createSession(agentId: string, inputFileName: string): ProcessSession {
  const sessionId = randomUUID();
  const created: ProcessSession = {
    sessionId,
    agentId,
    status: "queued",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    inputFileName,
    responseText: "",
    outputFiles: [],
  };

  sessions.set(sessionId, created);
  return created;
}

export function getSession(sessionId: string): ProcessSession | undefined {
  return sessions.get(sessionId);
}

export function updateSessionStatus(sessionId: string, status: SessionStatus, error?: string): void {
  const current = sessions.get(sessionId);
  if (!current) {
    return;
  }

  current.status = status;
  current.updatedAt = nowIso();
  if (error) {
    current.error = error;
  }
}

export function appendResponseText(sessionId: string, chunk: string): void {
  const current = sessions.get(sessionId);
  if (!current) {
    return;
  }

  current.responseText += chunk;
  current.updatedAt = nowIso();
}

export function attachOutputFile(sessionId: string, file: OutputFile): void {
  const current = sessions.get(sessionId);
  if (!current) {
    return;
  }

  current.outputFiles.push(file);
  current.updatedAt = nowIso();
}
