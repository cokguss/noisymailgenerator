const axios = require("axios");
const cheerio = require("cheerio");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

/* ============================================================
 * SHARED ENGINE - used by local relay (server/server.js)
 * and Vercel serverless functions (api/*.js)
 * ============================================================ */

class EmailParser {
  static extractOtp(text, html = null) {
    const combined = (text || '').trim();
    if (!combined && !html) return null;

    const mHyphen = combined.match(/\b([0-9]{3})[- ]([0-9]{3})\b/);
    if (mHyphen) return mHyphen[1] + mHyphen[2];

    const mKeyword = combined.match(
      /(?:kode\s*verifikasi|verification\s*code|security\s*code|confirmation\s*code|kode\s*keamanan|auth\s*code|passcode|kode\s*otp|otp|pin|code|kode)(?:(?:\s+[a-zA-Z]+){0,4})?\s*(?:adalah|is|:|:=|-|\s)\s*\b([0-9]{4,8})\b/i
    );
    if (mKeyword) {
      const val = mKeyword[1];
      if (!(val.length === 4 && (val.startsWith('19') || val.startsWith('20')) && !/code|kode|otp|pin/i.test(combined))) {
        return val;
      }
    }

    const mAction = combined.match(
      /(?:use\s*code|masukkan\s*kode|gunakan\s*kode|enter\s*(?:verification\s*)?code)\s*(?:adalah|is|:|:=|-|\s)?\s*\b([0-9]{4,8})\b/i
    );
    if (mAction) return mAction[1];

    const mAlpha = combined.match(
      /(?:otp|code|kode|token|password)(?:(?:\s+[a-zA-Z]+){0,3})?\s*(?:adalah|is|:|:=|-|\s)\s*\b([A-Z0-9]*[0-9][A-Z0-9]*)\b/i
    );
    if (mAlpha) {
      const val = mAlpha[1].trim();
      if (val.length >= 4 && val.length <= 8 && /[0-9]/.test(val) && /[a-zA-Z]/i.test(val)) {
        return val.toUpperCase();
      }
    }

    if (html) {
      const $ = cheerio.load(html);
      let foundHtmlOtp = null;
      $('b, strong, h1, h2, h3, td, span, font').each((_, el) => {
        const t = $(el).text().trim();
        if (/^[0-9]{4,8}$/.test(t) && !/^(19\d\d|20[2-3]\d)$/.test(t)) {
          foundHtmlOtp = t;
          return false;
        }
        if (/^[0-9]{3}[- ][0-9]{3}$/.test(t)) {
          foundHtmlOtp = t.replace(/[- ]/, '');
          return false;
        }
      });
      if (foundHtmlOtp) return foundHtmlOtp;
    }

    const mSixDigit = combined.match(/\b([0-9]{6})\b/);
    if (mSixDigit) return mSixDigit[1];

    return null;
  }

  static extractVerificationLinks(htmlContent) {
    if (!htmlContent) return { primary_link: null, all_links: [] };

    const $ = cheerio.load(htmlContent);
    const links = [];
    let primaryLink = null;
    let highestScore = -1;

    const actionKeywords = [
      'verify', 'verifikasi', 'confirm', 'konfirmasi', 'activate', 'aktifkan',
      'click here', 'klik di sini', 'log in', 'masuk', 'login', 'reset password',
      'complete registration', 'get started', 'join', 'accept', 'approve'
    ];

    const ignoreKeywords = [
      'unsubscribe', 'berhenti langganan', 'privacy policy', 'kebijakan privasi',
      'terms', 'syarat dan ketentuan', 'facebook', 'twitter', 'instagram', 'linkedin',
      'youtube', 'help center', 'pusat bantuan', 'contact us', 'hubungi kami',
      'support', 'preferences', 'settings', 'android', 'ios'
    ];

    $('a[href]').each((_, el) => {
      const href = ($(el).attr('href') || '').trim();
      if (!href.startsWith('http://') && !href.startsWith('https://')) return;

      const text = $(el).text().trim().toLowerCase();
      const hrefLower = href.toLowerCase();

      if (ignoreKeywords.some((junk) => text.includes(junk) || hrefLower.includes(junk))) {
        return;
      }

      let score = 0;
      for (const kw of actionKeywords) {
        if (text.includes(kw)) score += 15;
        if (hrefLower.includes(kw)) score += 5;
      }

      if (/token=|code=|key=|verify|activate|confirmation|auth\/links|auth_action/i.test(hrefLower)) {
        score += 10;
      }

      if (!links.some((l) => l.url === href)) {
        links.push({ text: $(el).text().trim(), url: href, score });
      }

      if (score > highestScore) {
        highestScore = score;
        primaryLink = href;
      }
    });

    links.sort((a, b) => b.score - a.score);

    if (!primaryLink && links.length > 0) {
      primaryLink = links[0].url;
    }

    return {
      primary_link: primaryLink,
      all_links: links.map((l) => ({ text: l.text, url: l.url }))
    };
  }
}

/* ============================================================
 * CMNTY TEMPMAIL CLIENT (primary network - REST API)
 * Create : GET /tempmail/create?apikey=
 * Inbox  : GET /tempmail/message?email=&apikey=
 * ============================================================ */
class CmntyMail {
  static BASE = "https://api.cmnty.eu.cc";
  static FALLBACK_KEY = "cmnty-373d1412a0f29bd96ba30bce37bd9812";

  get apiKey() {
    return process.env.CMNTY_API_KEY || CmntyMail.FALLBACK_KEY;
  }

  async request(pathname, params) {
    const res = await axios.get(`${CmntyMail.BASE}${pathname}`, {
      params,
      timeout: 15000,
      validateStatus: () => true
    });
    const body = res.data && typeof res.data === "object" ? res.data : null;
    if (res.status === 200 && body && body.status === true && body.result) return body.result;
    throw new Error((body && body.message) || `CMNTY request failed (HTTP ${res.status})`);
  }

  async createAddress() {
    const result = await this.request("/tempmail/create", { apikey: this.apiKey });
    const email = result.email || {};
    if (!email.address) throw new Error("CMNTY did not return an address");
    const [localPart, domainPart] = String(email.address).toLowerCase().split("@");
    return {
      address: String(email.address).toLowerCase(),
      username: email.username || localPart,
      domain: email.domain || domainPart
    };
  }

  /* Field names vary between upstream releases - read them defensively. */
  normalizeMessage(m = {}) {
    const pick = (...keys) =>
      keys.map((k) => m[k]).find((v) => v !== undefined && v !== null && v !== "");
    const str = (v) => (typeof v === "string" ? v.trim() : "");

    const htmlRaw = str(pick("html", "htmlBody", "body_html"));
    const body =
      str(pick("body_text", "text", "plain", "content")) ||
      (htmlRaw ? cheerio.load(htmlRaw).text().replace(/\n\s*\n/g, "\n").trim() : "");
    const linksInfo = EmailParser.extractVerificationLinks(htmlRaw);

    return {
      id: String(pick("id", "_id", "messageId", "uid") ?? ""),
      from: str(pick("from", "sender", "from_address", "fromAddress")) || "(unknown)",
      subject: str(pick("subject", "title")) || "(no subject)",
      date: str(pick("date", "created_at", "createdAt", "time", "receivedAt")),
      body_text: body.slice(0, 4000),
      otp: EmailParser.extractOtp(body, htmlRaw || null),
      verification_link: linksInfo.primary_link,
      all_links: linksInfo.all_links.map((l) => l.url)
    };
  }

  async getMessages(email) {
    const result = await this.request("/tempmail/message", { email, apikey: this.apiKey });
    const raw =
      result.messages && Array.isArray(result.messages.list) ? result.messages.list : [];
    return raw.map((m) => this.normalizeMessage(m));
  }

  async getMessage(email, messageId) {
    const list = await this.getMessages(email);
    return (
      list.find((m) => String(m.id) === String(messageId)) ||
      list.find((m) => !messageId) ||
      null
    );
  }
}

/* ============================================================
 * VISITOR STATS - privacy-friendly, aggregate-only.
 * IPs are hashed with a daily salt; no cookies, no profiles.
 * Storage: Vercel KV (if env vars set) > JSON file (local) > memory.
 * ============================================================ */

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

class KvStore {
  constructor(url, token) {
    this.url = url.replace(/\/$/, "");
    this.token = token;
  }
  async cmd(parts) {
    const res = await fetch(
      `${this.url}/${parts.map(encodeURIComponent).join("/")}`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    const json = await res.json().catch(() => null);
    return json ? json.result : null;
  }
  incr(k) { return this.cmd(["incr", k]); }
  get(k) { return this.cmd(["get", k]); }
  sadd(k, m) { return this.cmd(["sadd", k, m]); }
  scard(k) { return this.cmd(["scard", k]); }
  hincr(h, f, by = 1) { return this.cmd(["hincrby", h, f, String(by)]); }
  async hgetall(h) {
    const result = await this.cmd(["hgetall", h]);
    return result && typeof result === "object" ? result : {};
  }
}

function createStore() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      return new KvStore(process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN);
    } catch (_) {}
  }
  try {
    return new FileStore(path.join(process.cwd(), "data", "stats.json"));
  } catch (_) {}
  return new MemoryStore();
}

/* ============================================================
 * HIGH-LEVEL OPERATIONS (shared by express + serverless)
 * ============================================================ */
function createEngine() {
  const cmnty = new CmntyMail();
  const statsStore = createStore();

  function fmt(status, data, message = null, errorCode = null) {
    const out = { status, data };
    if (message) out.message = message;
    if (errorCode) out.error_code = errorCode;
    return out;
  }

  /* ---------- visitor stats ---------- */

  async function opTrack({ page, ref, ua, ip } = {}) {
    try {
      const day = new Date().toISOString().slice(0, 10);
      const safePage = String(page || "home").replace(/[^a-z0-9\-_]/gi, "").slice(0, 24) || "home";
      const uid = crypto
        .createHash("sha256")
        .update(`${ip}|${ua}|${day}`)
        .digest("hex")
        .slice(0, 20);

      await statsStore.incr("stats:total");
      await statsStore.incr(`stats:day:${day}`);
      await statsStore.sadd(`stats:uniq:${day}`, uid);

      const device = /iPad|Tablet/i.test(ua)
        ? "tablet"
        : /Mobi|Android|iPhone/i.test(ua)
          ? "mobile"
          : "desktop";
      await statsStore.hincr("stats:devices", device);

      if (ref) {
        try {
          const host = new URL(ref).hostname.replace(/^www\./, "").slice(0, 60);
          if (host && !/^(localhost|127\.0\.0\.1)$/.test(host)) {
            await statsStore.hincr("stats:refs", host);
          }
        } catch (_) {}
      }

      await statsStore.hincr("stats:pages", safePage);
      return fmt("success", { tracked: true });
    } catch (err) {
      return fmt("error", null, err.message);
    }
  }

  async function opStats(key) {
    const expected = process.env.STATS_KEY || "noisy-admin";
    if (String(key || "") !== expected) {
      return fmt("error", null, "Invalid stats key", "UNAUTHORIZED");
    }

    const now = new Date();
    const dayStr = (offset) => {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - offset);
      return d.toISOString().slice(0, 10);
    };

    const total = Number((await statsStore.get("stats:total")) || 0);
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = dayStr(i);
      days.push({
        date,
        views: Number((await statsStore.get(`stats:day:${date}`)) || 0),
        uniq: Number((await statsStore.scard(`stats:uniq:${date}`)) || 0)
      });
    }

    const topEntries = (h, limit) =>
      Object.entries(h)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));

    const pages = topEntries(await statsStore.hgetall("stats:pages"), 8);
    const refs = topEntries(await statsStore.hgetall("stats:refs"), 8);
    const devices = topEntries(await statsStore.hgetall("stats:devices"), 5);

    return fmt("success", {
      total,
      today: { views: days[days.length - 1].views, uniq: days[days.length - 1].uniq },
      yesterday: { views: days[days.length - 2].views, uniq: days[days.length - 2].uniq },
      days,
      pages,
      refs,
      devices
    });
  }

  async function opStatus() {
    return {
      status: 'online',
      service: 'NoisyMail Relay',
      networks: ['cmnty'],
      endpoints: ['/api/generate', '/api/inbox', '/api/message']
    };
  }

  async function opGenerate() {
    try {
      const created = await cmnty.createAddress();
      return fmt('success', {
        email: created.address,
        username: created.username,
        domain: created.domain,
        network: 'cmnty'
      });
    } catch (err) {
      return fmt('error', null, err.message, 'CMNTY_ERROR');
    }
  }

  async function opInbox({ email } = {}) {
    if (!email) return fmt('error', null, 'Email parameter is required', 'MISSING_PARAM');
    const formatted = String(email).trim().toLowerCase();

    try {
      const messages = await cmnty.getMessages(formatted);
      return fmt('success', {
        email: formatted,
        total_messages: messages.length,
        /* full detail ships with the list so the UI renders bodies
           without a second round-trip per message */
        messages: messages.map((m) => ({
          from: m.from,
          subject: m.subject,
          date: m.date,
          link: m.id,
          detail: {
            text: m.body_text,
            links: m.all_links.slice(0, 10),
            otp: m.otp,
            verif: m.verification_link
          }
        }))
      });
    } catch (err) {
      return fmt('error', null, err.message, 'CMNTY_ERROR');
    }
  }

  async function opMessage({ email, link } = {}) {
    if (!email || !link) {
      return fmt('error', null, 'Email and link parameters are required', 'MISSING_PARAMS');
    }
    const formatted = String(email).trim().toLowerCase();

    try {
      const msg = await cmnty.getMessage(formatted, link);
      if (!msg) return fmt('error', null, 'Message not found in inbox', 'NOT_FOUND');
      return fmt('success', { email: formatted, ...msg });
    } catch (err) {
      return fmt('error', null, err.message, 'CMNTY_ERROR');
    }
  }

  return { cmnty, opStatus, opGenerate, opInbox, opMessage, opTrack, opStats };
}

module.exports = {
  createEngine,
  EmailParser,
  CmntyMail
};
