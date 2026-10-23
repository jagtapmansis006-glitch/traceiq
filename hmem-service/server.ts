import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadHMEM } from "./src/engine.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8090);

async function main() {
  const { HMEM, source } = await loadHMEM();
  const hmem = new HMEM({ persistDir: process.env.HMEM_DIR || path.join(here, ".traceiq-memory") });
  console.log(`H-MEM engine source: ${source}`);

  const PARSE = /^Incident (\S+) on (\S+)\. Root cause: ([\s\S]*?) \|\| Fix: ([\s\S]*)$/;

  const readBody = (req: http.IncomingMessage): Promise<any> =>
    new Promise((resolve) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); }
      });
    });

  const send = (res: http.ServerResponse, code: number, obj: unknown) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(obj));
  };

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://localhost");

      if (req.method === "GET" && url.pathname === "/health") {
        return send(res, 200, { ok: true, engine: source });
      }

      if (req.method === "GET" && url.pathname === "/audit") {
        const id = url.searchParams.get("id") || "";
        return send(res, 200, { id, history: hmem.ledger.history(id) });
      }

      if (req.method === "POST" && url.pathname === "/save") {
        const b = await readBody(req);
        const content = `Incident ${b.incident_id} on ${b.service}. Root cause: ${b.root_cause} || Fix: ${b.fix}`;
        const rec = hmem.add({ content, type: "general", source: `traceiq:${b.incident_id}` });
        console.log(`SAVED ${b.incident_id} as ${rec.id}`);
        return send(res, 200, { saved: true, memory_id: rec.id });
      }

      if (req.method === "POST" && url.pathname === "/recall") {
        const b = await readBody(req);
        const result = hmem.query(`${b.service} ${b.root_cause}`, { threshold: 0.05 });
        let best: any = null;
        for (const r of result.memories) {
          const m = PARSE.exec(r.memory.content);
          if (!m) continue;
          if (m[1] === b.incident_id) continue; // never match itself
          const sameService = m[2].toLowerCase() === String(b.service || "").toLowerCase();
          const score = r.relevance + (sameService ? 0.5 : 0);
          if (!best || score > best.score) {
            best = {
              score,
              id: m[1],
              root_cause: m[3],
              fix: m[4],
              match_reason: sameService ? "same service" : "similar root cause",
              memory_id: r.memory.id,
              relevance: r.relevance,
            };
          }
        }
        if (!best) return send(res, 200, { match: null });
        console.log(`RECALLED ${best.id} (${best.memory_id})`);
        return send(res, 200, { match: best });
      }

      send(res, 404, { error: "not found" });
    } catch (e: any) {
      console.error("ERROR", e?.message || e);
      send(res, 500, { error: String(e?.message || e) });
    }
  });

  server.listen(PORT, () => console.log(`H-MEM service listening on port ${PORT}`));
}

main();