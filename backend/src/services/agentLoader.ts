import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import type { AgentSummary } from "../types";

const AGENTS_DIR = path.resolve(process.cwd(), "..", ".github", "agents");

const agentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  instructions: z.string().min(1),
});

function walkFiles(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      results.push(fullPath);
    }
  }

  return results;
}

export function loadAgents(): AgentSummary[] {
  const files = walkFiles(AGENTS_DIR);
  const seenIds = new Set<string>();
  const agents: AgentSummary[] = [];

  for (const filePath of files) {
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      const agent = agentSchema.parse(parsed);

      if (seenIds.has(agent.id)) {
        // Skip duplicate IDs so the API stays deterministic.
        continue;
      }

      seenIds.add(agent.id);
      agents.push({
        ...agent,
        sourcePath: path.relative(path.resolve(process.cwd(), ".."), filePath),
      });
    } catch {
      // Invalid files are ignored for MVP resilience.
      continue;
    }
  }

  return agents.sort((a, b) => a.name.localeCompare(b.name));
}
