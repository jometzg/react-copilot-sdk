import type { Response } from "express";

import type { StreamEvent } from "../types";

const subscribers = new Map<string, Set<Response>>();

export function subscribe(sessionId: string, res: Response): void {
  const set = subscribers.get(sessionId) ?? new Set<Response>();
  set.add(res);
  subscribers.set(sessionId, set);
}

export function unsubscribe(sessionId: string, res: Response): void {
  const set = subscribers.get(sessionId);
  if (!set) {
    return;
  }

  set.delete(res);
  if (set.size === 0) {
    subscribers.delete(sessionId);
  }
}

export function publish(sessionId: string, event: StreamEvent): void {
  const set = subscribers.get(sessionId);
  if (!set) {
    // eslint-disable-next-line no-console
    console.warn(`[StreamHub] No subscribers for session ${sessionId}, event ${event.type} dropped`);
    return;
  }

  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  // eslint-disable-next-line no-console
  console.log(`[StreamHub] Publishing ${event.type} to ${set.size} subscriber(s) on session ${sessionId}`);
  for (const res of set) {
    res.write(payload);
  }
}
