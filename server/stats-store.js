/* Node-only persistent stats store (JSON file with debounced flush).
   Injected into the shared engine via createEngine({ statsStore }). */
const fs = require("fs");
const path = require("path");

class MemoryStore {
  constructor() {
    this.c = {};
    this.s = {};
    this.h = {};
  }
  async incr(k) { this.c[k] = (this.c[k] || 0) + 1; return this.c[k]; }
  async get(k) { return this.c[k] || 0; }
  async sadd(k, m) { (this.s[k] = this.s[k] || new Set()).add(m); }
  async scard(k) { return this.s[k] ? this.s[k].size : 0; }
  async hincr(h, f, by = 1) {
    this.h[h] = this.h[h] || {};
    this.h[h][f] = (this.h[h][f] || 0) + by;
  }
  async hgetall(h) { return { ...this.h[h] }; }
}

class FileStore extends MemoryStore {
  constructor(file) {
    super();
    this.file = file;
    this._timer = null;
    try {
      const raw = JSON.parse(fs.readFileSync(file, "utf8"));
      this.c = raw.c || {};
      this.h = raw.h || {};
      for (const [k, arr] of Object.entries(raw.s || {})) {
        this.s[k] = new Set(arr);
      }
    } catch (_) {}
  }
  _flush() {
    if (this._timer) return;
    this._timer = setTimeout(() => {
      this._timer = null;
      try {
        const s = {};
        for (const [k, set] of Object.entries(this.s)) s[k] = [...set];
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        fs.writeFileSync(this.file, JSON.stringify({ c: this.c, s, h: this.h }));
      } catch (_) {}
    }, 500);
  }
  async incr(k) { const r = await super.incr(k); this._flush(); return r; }
  async hincr(h, f, by = 1) { const r = await super.hincr(h, f, by); this._flush(); return r; }
  async sadd(k, m) { await super.sadd(k, m); this._flush(); }
}

function createNodeStatsStore() {
  try {
    return new FileStore(path.join(process.cwd(), "data", "stats.json"));
  } catch (_) {
    return new MemoryStore();
  }
}

module.exports = { createNodeStatsStore };
