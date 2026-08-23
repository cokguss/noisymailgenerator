/* ============================================================
 * CLOUDFLARE WORKER ENTRY
 * Serves the static landing page from public/ (via ASSETS binding)
 * and handles /api/* using the shared engine (fetch-based).
 *
 * Optional persistent stats: bind a KV namespace as STATS_KV
 * in wrangler.jsonc; without it, stats live in isolate memory.
 * ============================================================ */
import { createEngine } from "./api/_engine.js";

/* ---- KV-binding stats store (Cloudflare Workers) ---- */
class KvBindingStore {
  constructor(ns) {
    this.ns = ns;
    this.mem = null; // lazy in-memory fallback if KV errors
  }
  async _getJson(k, fallback) {
    try {
      const v = await this.ns.get(k);
      return v === null ? fallback : JSON.parse(v);
    } catch (_) {
      return fallback;
    }
  }
  async _putJson(k, v) {
    try {
      await this.ns.put(k, JSON.stringify(v));
    } catch (_) {}
  }
  async incr(k) {
    const n = Number(await this._getJson(k, 0)) + 1;
    await this._putJson(k, n);
    return n;
  }
  async get(k) {
    return Number(await this._getJson(k, 0)) || 0;
  }
  /* sets are capped to keep KV values small */
  async sadd(k, m) {
    const arr = await this._getJson(k, []);
    if (!arr.includes(m) && arr.length < 5000) arr.push(m);
    await this._putJson(k, arr);
  }
  async scard(k) {
    return (await this._getJson(k, [])).length;
  }
  async hincr(h, f, by = 1) {
    const obj = await this._getJson(h, {});
    obj[f] = (obj[f] || 0) + by;
    await this._putJson(h, obj);
  }
  async hgetall(h) {
    const obj = await this._getJson(h, {});
    return obj && typeof obj === "object" ? obj : {};
  }
}

/* engine is created once per isolate; store chosen from bindings */
let cachedEngine = null;
function getEngine(env) {
  if (!cachedEngine) {
    const statsStore =
      env && env.STATS_KV ? new KvBindingStore(env.STATS_KV) : undefined;
    cachedEngine = createEngine(statsStore ? { statsStore } : {});
  }
  return cachedEngine;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (!path.startsWith("/api/")) {
      // everything else is the static landing page
      return env.ASSETS.fetch(request);
    }

    const engine = getEngine(env);
    const q = url.searchParams;

    try {
      switch (path) {
        case "/api/status":
          return json(await engine.opStatus());

        case "/api/generate": {
          const out = await engine.opGenerate();
          return json(out, out.status === "error" ? 502 : 200);
        }

        case "/api/inbox":
          return json(await engine.opInbox({ email: q.get("email") }));

        case "/api/message":
          return json(
            await engine.opMessage({ email: q.get("email"), link: q.get("link") })
          );

        case "/api/track": {
          const ip = request.headers.get("cf-connecting-ip") || "";
          const ua = request.headers.get("user-agent") || "";
          return json(
            await engine.opTrack({
              page: q.get("page"),
              ref: q.get("ref"),
              ua,
              ip
            })
          );
        }

        case "/api/stats": {
          const out = await engine.opStats(q.get("key"));
          return json(
            out,
            out.status === "error" && out.error_code === "UNAUTHORIZED" ? 401 : 200
          );
        }

        default:
          return json({ status: "error", data: null, message: "Not found" }, 404);
      }
    } catch (err) {
      return json({ status: "error", data: null, message: err.message }, 500);
    }
  }
};
