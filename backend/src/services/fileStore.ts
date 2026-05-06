import fs from "node:fs";
import path from "node:path";

import { randomUUID } from "node:crypto";

import type { OutputFile } from "../types";

const uploadsRoot = path.resolve(process.cwd(), "data", "uploads");
const outputsRoot = path.resolve(process.cwd(), "data", "outputs");

for (const dir of [uploadsRoot, outputsRoot]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function saveUploadedCsv(sessionId: string, originalName: string, content: Buffer): string {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(uploadsRoot, `${sessionId}-${safeName}`);
  fs.writeFileSync(filePath, content);
  return filePath;
}

export function readTextFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

export function writeGeneratedTextFile(sessionId: string, fileName: string, content: string): { meta: OutputFile; absolutePath: string } {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileId = randomUUID();
  const absolutePath = path.join(outputsRoot, `${sessionId}-${fileId}-${safeName}`);
  fs.writeFileSync(absolutePath, content, "utf8");

  const size = fs.statSync(absolutePath).size;
  return {
    meta: {
      fileId,
      fileName: safeName,
      mimeType: "text/plain",
      size,
    },
    absolutePath,
  };
}

export function readGeneratedFile(absolutePath: string): Buffer {
  return fs.readFileSync(absolutePath);
}
