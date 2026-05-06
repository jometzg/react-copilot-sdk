import { Router } from "express";
import multer from "multer";

import { loadAgents } from "../services/agentLoader";
import { runCopilotAgent } from "../services/copilotService";
import {
  readGeneratedFile,
  readTextFile,
  saveUploadedCsv,
  writeGeneratedTextFile,
} from "../services/fileStore";
import {
  appendResponseText,
  attachOutputFile,
  createSession,
  getSession,
  updateSessionStatus,
} from "../services/sessionStore";
import { publish, subscribe, unsubscribe } from "../services/streamHub";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const filePathBySessionAndId = new Map<string, string>();

const processRouter = Router();

processRouter.post("/", upload.single("file"), async (req, res) => {
  // eslint-disable-next-line no-console
  console.log("[POST /api/process] Request received");
  
  const selectedAgentId = req.body.agentId;
  const file = req.file;

  // eslint-disable-next-line no-console
  console.log(`[POST /api/process] agentId: ${selectedAgentId}, file: ${file?.originalname}`);

  if (!file) {
    // eslint-disable-next-line no-console
    console.error("[POST /api/process] ERROR: No file");
    res.status(400).json({ error: "CSV file is required." });
    return;
  }

  if (!selectedAgentId || typeof selectedAgentId !== "string") {
    res.status(400).json({ error: "agentId is required." });
    return;
  }

  const isCsv = file.originalname.toLowerCase().endsWith(".csv");
  if (!isCsv) {
    res.status(400).json({ error: "Only .csv files are supported." });
    return;
  }

  const agent = loadAgents().find((candidate) => candidate.id === selectedAgentId);
  if (!agent) {
    res.status(404).json({ error: "Agent not found." });
    return;
  }

  const session = createSession(agent.id, file.originalname);
  const uploadedFilePath = saveUploadedCsv(session.sessionId, file.originalname, file.buffer);

  // eslint-disable-next-line no-console
  console.log(`[Session ${session.sessionId}] Created for agent "${agent.name}", file: ${file.originalname}`);

  res.status(202).json({
    sessionId: session.sessionId,
    status: session.status,
  });

  // Wait 500ms to allow frontend to connect EventSource stream before publishing events
  setTimeout(async () => {
    try {
      // eslint-disable-next-line no-console
      console.log(`[Session ${session.sessionId}] Starting async processing...`);
      
      updateSessionStatus(session.sessionId, "processing");
      publish(session.sessionId, {
        type: "status",
        status: "processing",
        message: "Processing started",
      });

      const csvText = readTextFile(uploadedFilePath);
      // eslint-disable-next-line no-console
      console.log(`[Session ${session.sessionId}] Running agent with CSV (${csvText.length} chars)...`);
      
      const result = await runCopilotAgent(agent, csvText);
      // eslint-disable-next-line no-console
      console.log(`[Session ${session.sessionId}] Agent returned ${result.responseText.length} chars, ${result.generatedFile ? "with file" : "no file"}`);

      for (const chunk of result.responseText.split(/(?<=\.)\s+/)) {
        const piece = `${chunk}\n`;
        appendResponseText(session.sessionId, piece);
        publish(session.sessionId, { type: "chunk", chunk: piece });
      }

      if (result.generatedFile) {
        // eslint-disable-next-line no-console
        console.log(`[Session ${session.sessionId}] Writing file: ${result.generatedFile.fileName}`);
        
        const generated = writeGeneratedTextFile(
          session.sessionId,
          result.generatedFile.fileName,
          result.generatedFile.content,
        );
        attachOutputFile(session.sessionId, generated.meta);
        filePathBySessionAndId.set(`${session.sessionId}:${generated.meta.fileId}`, generated.absolutePath);
        publish(session.sessionId, { type: "artifact", file: generated.meta });
        
        // eslint-disable-next-line no-console
        console.log(`[Session ${session.sessionId}] File published: ${generated.meta.fileName} (${generated.meta.fileId})`);
      }

      updateSessionStatus(session.sessionId, "completed");
      const latest = getSession(session.sessionId);
      if (latest) {
        // eslint-disable-next-line no-console
        console.log(`[Session ${session.sessionId}] Publishing completed event`);
        publish(session.sessionId, { type: "completed", session: latest });
      }
      // eslint-disable-next-line no-console
      console.log(`[Session ${session.sessionId}] Processing complete`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown processing error";
      // eslint-disable-next-line no-console
      console.error(`[Session ${session.sessionId}] Error:`, message);
      updateSessionStatus(session.sessionId, "error", message);
      publish(session.sessionId, { type: "agent-error", message });
    }
  }, 500);
});

processRouter.get("/:sessionId", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found." });
    return;
  }

  res.json(session);
});

processRouter.get("/:sessionId/stream", (req, res) => {
  const { sessionId } = req.params;
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  subscribe(sessionId, res);

  // Push initial snapshot when stream starts.
  res.write(`event: status\ndata: ${JSON.stringify({ type: "status", status: session.status, message: "Stream connected" })}\n\n`);

  req.on("close", () => {
    unsubscribe(sessionId, res);
    res.end();
  });
});

processRouter.get("/:sessionId/files", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found." });
    return;
  }

  res.json({ files: session.outputFiles });
});

processRouter.get("/:sessionId/files/:fileId/download", (req, res) => {
  const { sessionId, fileId } = req.params;
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found." });
    return;
  }

  const fileMeta = session.outputFiles.find((f) => f.fileId === fileId);
  if (!fileMeta) {
    res.status(404).json({ error: "File not found." });
    return;
  }

  const absolutePath = filePathBySessionAndId.get(`${sessionId}:${fileId}`);
  if (!absolutePath) {
    res.status(404).json({ error: "File path not found." });
    return;
  }

  const content = readGeneratedFile(absolutePath);
  res.setHeader("Content-Type", fileMeta.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename=\"${fileMeta.fileName}\"`);
  res.send(content);
});

export { processRouter };
