import { Router } from "express";

import { loadAgents } from "../services/agentLoader";

const agentsRouter = Router();

agentsRouter.get("/", (_req, res) => {
  const agents = loadAgents();
  res.json({ agents });
});

export { agentsRouter };
