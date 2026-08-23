const cheerio = require("cheerio");

/* ============================================================
 * SHARED ENGINE - runtime-agnostic (Node, Cloudflare Workers,
 * and serverless functions). Only fetch + Web Crypto are used.
 * ============================================================ */

async function sha256Prefix(text, len = 20) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, len);
}

class EmailParser {
  /* pull the readable body out of a generator.email message page */
  static extractCleanBody($) {
    const selectors = [
      'div.mess_bodiyy',
      'div[class*="mess_bod"]',
      'div.user_mess_content',
      '#email_content',
      '#mail-summary-body'
    ];

    for (const sel of selectors) {
      const container = $(sel);
      if (container.length > 0) {
        const clone = container.first().clone();
        clone.find('script, style, ins, button, iframe, .adsbygoogle, .mesg-row, .mailsrc-panel, .tooltip-container').remove();
        const bodyText = clone.text().replace(/\n\s*\n/g, '\n').trim();
        const rawHtml = clone.html() || '';
        return { bodyText, rawHtml };
      }
    }

    return { bodyText: '', rawHtml: '' };
  }

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
 * GENERATOR.EMAIL CLIENT (free, no key - HTML based)
 * Technique: GET /{domain}/{username} with the inbox_ctx cookie,
 * parse the .list-group-item rows (from_div/subj_div/time_div and
 * the loadInboxClientSide onclick link). No quota, no API key.
 * ============================================================ */
class GeneratorEmail {
  static BASE = 'https://generator.email';
  static UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  constructor() {
    this._domain = null;
    this._domainAt = 0;
    this.CACHE_TTL = 120000;
  }

  async _get(pathname, extraHeaders = {}) {
    return fetch(GeneratorEmail.BASE + pathname, {
      headers: {
        'User-Agent': GeneratorEmail.UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        Referer: GeneratorEmail.BASE + '/',
        ...extraHeaders
      },
      signal: AbortSignal.timeout(15000)
    });
  }

  static _cookies(domain, username, email) {
    return (
      'inbox_ctx=' + encodeURIComponent(domain + '/' + username + '/') +
      '; surl=' + domain + '/' + username +
      '; embx=' + encodeURIComponent(JSON.stringify([email]))
    );
  }

  /* the homepage shows the site's currently active mail domain */
  async _activeDomain() {
    const now = Date.now();
    if (this._domain && now - this._domainAt < this.CACHE_TTL) return this._domain;
    let domain = 'generator.email';
    try {
      const res = await this._get('/');
      if (res.ok) {
        const $ = cheerio.load(await res.text());
        const shown = ($('#email_ch_text').text() || '').trim();
        const found =
          $('#domainName2').attr('value') ||
          $('#domainName').attr('value') ||
          (shown.includes('@') ? shown.split('@')[1] : '');
        if (found) domain = String(found).toLowerCase();
      }
    } catch (_) {}
    this._domain = domain;
    this._domainAt = now;
    return domain;
  }

  async createAddress() {
    const domain = await this._activeDomain();
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    const username = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    return { address: username + '@' + domain, username, domain };
  }

  async getMessages(email) {
    const formatted = String(email || '').trim().toLowerCase();
    const [username, domain] = formatted.split('@');
    if (!username || !domain) throw new Error('Invalid email format: ' + formatted);

    const res = await this._get('/' + domain + '/' + username, {
      Cookie: GeneratorEmail._cookies(domain, username, formatted)
    });
    if (!res.ok) throw new Error('Inbox fetch failed (HTTP ' + res.status + ')');

    const $ = cheerio.load(await res.text());
    const messages = [];

    $('.list-group-item').each((_, el) => {
      const item = $(el);
      if (item.hasClass('active')) return;
      const from = item.find('[class*="from_div"]').text().trim();
      const subject = item.find('[class*="subj_div"]').text().trim();
      const date = item.find('[class*="time_div"]').text().trim();
      if (!from && !subject) return;
      if (from === 'From' && subject === 'Subject') return; // header row

      const onclick = item.attr('onclick') || '';
      const m = onclick.match(/loadInboxClientSide\(['"]([^'"]+)['"]\)/);
      messages.push({
        id: m ? m[1] : '',
        from: from || '(unknown)',
        subject: subject || '(no subject)',
        date
      });
    });

    return messages;
  }

  async readMessage(email, link) {
    const formatted = String(email || '').trim().toLowerCase();
    const [username, domain] = formatted.split('@');
    if (!username || !domain) throw new Error('Invalid email format: ' + formatted);

    const clean = String(link || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');
    const target = clean.startsWith(domain) ? '/' + clean : '/' + domain + '/' + username + '/' + clean;

    const res = await this._get(target, {
      Cookie: GeneratorEmail._cookies(domain, username, formatted),
      Referer: GeneratorEmail.BASE + '/inbox1/'
    });
    if (!res.ok) throw new Error('Failed to load message (HTTP ' + res.status + ')');

    const $ = cheerio.load(await res.text());
    let from = '', subject = '', date = '';
    const head = $('#mail-summary-head').text() || '';
    for (const line of head.split('\n')) {
      const l = line.toLowerCase();
      if (l.includes('from:') || l.includes('dari:')) from = line.replace(/^(from|dari):\s*/i, '').trim();
      else if (l.includes('subject:') || l.includes('subjek:')) subject = line.replace(/^(subject|subjek):\s*/i, '').trim();
      else if (l.includes('date:') || l.includes('tanggal:') || l.includes('received:')) date = line.replace(/^(date|tanggal|received):\s*/i, '').trim();
    }

    const { bodyText, rawHtml } = EmailParser.extractCleanBody($);
    const linksInfo = EmailParser.extractVerificationLinks(rawHtml);

    return {
      from,
      subject,
      date,
      body_text: bodyText.slice(0, 4000),
      otp: EmailParser.extractOtp(bodyText, rawHtml),
      verification_link: linksInfo.primary_link,
      all_links: linksInfo.all_links.map((l) => l.url)
    };
  }
}

/* ============================================================
 * VISITOR STATS - privacy-friendly, aggregate-only.
 * IPs are hashed with a daily salt; no cookies, no profiles.
 * Storage here is runtime-safe everywhere (REST KV > memory).
 * Node-only persistent file store lives in server/stats-store.js
 * and is injected via createEngine({ statsStore }).
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

/* ============================================================
 * SUPABASE STORE (Postgres via PostgREST RPC, fetch-based)
 * Setup: run supabase/stats-setup.sql once in the SQL editor,
 * then provide SUPABASE_URL + SUPABASE_KEY (service_role).
 * Works on Node, serverless, and Cloudflare Workers.
 * ============================================================ */
class SupabaseStore {
  constructor(url, key) {
    this.base = String(url).replace(/\/$/, "");
    this.key = key;
  }

  async rpc(fn, args) {
    const res = await fetch(`${this.base}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: this.key,
        authorization: `Bearer ${this.key}`
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) throw new Error(`Supabase rpc ${fn} failed (HTTP ${res.status})`);
    return res.json().catch(() => null);
  }

  async incr(k) {
    return Number(await this.rpc("stats_incr", { p_key: k })) || 0;
  }
  async get(k) {
    return Number(await this.rpc("stats_get", { p_key: k })) || 0;
  }
  async sadd(k, m) {
    await this.rpc("stats_sadd", { p_key: k, p_member: m });
  }
  async scard(k) {
    return Number(await this.rpc("stats_scard", { p_key: k })) || 0;
  }
  async hincr(h, f, by = 1) {
    await this.rpc("stats_hincr", { p_key: h, p_field: f, p_by: by });
  }
  async hgetall(h) {
    const v = await this.rpc("stats_hgetall", { p_key: h });
    return v && typeof v === "object" ? v : {};
  }
}

function createStore() {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY;
  if (env.SUPABASE_URL && supabaseKey) {
    try {
      return new SupabaseStore(env.SUPABASE_URL, supabaseKey);
    } catch (_) {}
  }
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) {
    try {
      return new KvStore(env.KV_REST_API_URL, env.KV_REST_API_TOKEN);
    } catch (_) {}
  }
  return new MemoryStore();
}

/* ============================================================
 * HIGH-LEVEL OPERATIONS (shared by express + workers + serverless)
 * ============================================================ */
function createEngine(options = {}) {
  const mail = new GeneratorEmail();
  const statsStore = options.statsStore || createStore();

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
      const uid = await sha256Prefix(`${ip}|${ua}|${day}`, 20);

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
    const envKey =
      typeof process !== "undefined" && process.env ? process.env.STATS_KEY : null;
    const expected = envKey || "noisy-admin";
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
      networks: ['generator'],
      endpoints: ['/api/generate', '/api/inbox', '/api/message']
    };
  }

  async function opGenerate() {
    try {
      const created = await mail.createAddress();
      return fmt('success', {
        email: created.address,
        username: created.username,
        domain: created.domain,
        network: 'generator'
      });
    } catch (err) {
      return fmt('error', null, err.message, 'MAIL_ERROR');
    }
  }

  async function opInbox({ email } = {}) {
    if (!email) return fmt('error', null, 'Email parameter is required', 'MISSING_PARAM');
    const formatted = String(email).trim().toLowerCase();

    try {
      const messages = await mail.getMessages(formatted);
      return fmt('success', {
        email: formatted,
        total_messages: messages.length,
        /* bodies live on the message page - the UI fetches them on click */
        messages: messages.map((m) => ({
          from: m.from,
          subject: m.subject,
          date: m.date,
          link: m.id,
          detail: null
        }))
      });
    } catch (err) {
      return fmt('error', null, err.message, 'MAIL_ERROR');
    }
  }

  async function opMessage({ email, link } = {}) {
    if (!email || !link) {
      return fmt('error', null, 'Email and link parameters are required', 'MISSING_PARAMS');
    }
    const formatted = String(email).trim().toLowerCase();

    try {
      const msg = await mail.readMessage(formatted, link);
      return fmt('success', { email: formatted, ...msg });
    } catch (err) {
      return fmt('error', null, err.message, 'MAIL_ERROR');
    }
  }

  return { mail, opStatus, opGenerate, opInbox, opMessage, opTrack, opStats };
}

module.exports = {
  createEngine,
  EmailParser,
  GeneratorEmail,
  SupabaseStore
};
