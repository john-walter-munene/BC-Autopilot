/**
 * API entry point.
 * Overlay counterpart: apps/api/src/main.ts
 *
 * Serves the agent routes consumed by the React console plus the Phase 1 AL compiler routes.
 */

import http from "node:http";
import { BC_CONSTANTS } from "@bc-agent/shared";
import { alCompilerController } from "./modules/al-compiler/al-compiler.controller.ts";
import { agentController } from "./modules/agent/agent.controller.ts";
import type { Phase1PipelineRequest } from "@bc-agent/shared";

const PORT = Number(process.env.PORT ?? BC_CONSTANTS.DEFAULT_PORT);

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
}

async function readJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw.length > 0 ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

export function createServer(): http.Server {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/api/health") {
        return sendJson(res, 200, { status: "ok", service: "bc-agent-api" });
      }

      if (req.method !== "POST") {
        return sendJson(res, 404, { error: "Not found" });
      }

      const body = await readJson(req);

      switch (req.url) {
        case "/api/agent/explore-docs":
          return sendJson(res, 200, await agentController.exploreDocs(body));
        case "/api/agent/parse-frd":
          return sendJson(res, 200, await agentController.parseFrd(body as never));
        case "/api/agent/generate-al":
        case "/api/agent/generate-al-custom":
          return sendJson(res, 200, await agentController.generateAl(body as never));
        case "/api/agent/chat":
          return sendJson(res, 200, await agentController.chat(body as never));
        case "/api/agent/learn-from-doc":
          return sendJson(res, 200, await agentController.learnFromDoc(body as never));
        case "/api/agent/reflect-and-improve":
          return sendJson(res, 200, await agentController.reflectAndImprove(body as never));
        case "/api/al/compile": {
          const result = await alCompilerController.compile(body as unknown as Phase1PipelineRequest);
          return sendJson(res, result.success ? 200 : 422, result);
        }
        case "/api/al/publish": {
          const result = await alCompilerController.publish(body as never);
          return sendJson(res, result.success ? 200 : 422, result);
        }
        case "/api/al/sandbox": {
          const result = await alCompilerController.provisionSandbox(body as never);
          return sendJson(res, result.success ? 200 : 422, result);
        }
        default:
          return sendJson(res, 404, { error: "Not found" });
      }
    } catch (error) {
      return sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  });
}

if (process.argv[1]?.includes("main.ts") || process.argv[1]?.includes("main.js")) {
  createServer().listen(PORT, () => {
    console.log(`[bc-agent-api] listening on http://localhost:${PORT}`);
  });
}