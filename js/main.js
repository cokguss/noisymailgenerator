(() => {
  "use strict";

  const LOCAL_BASE = "http://127.0.0.1:8000/api";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (id) => document.getElementById(id);
  const t = (key, vars) =>
    window.NoisyI18n ? window.NoisyI18n.t(key, vars) : key;

  const el = {
    status: $("widgetStatus"),
    address: $("addressText"),
    addressLive: $("addressLive"),
    hint: $("widgetHint"),
    metaInfo: $("metaInfo"),
    providerBadge: $("providerBadge"),
    copyBtn: $("copyBtn"),
    regenBtn: $("regenBtn"),
    widget: $("widget"),
    navToggle: $("navToggle"),
    navLinks: $("navLinks"),
    inboxPath: $("inboxPath"),
    mailList: $("mailList"),
    pollStatus: $("pollStatus"),
    refreshInbox: $("refreshInbox"),
    bentoInterval: $("bentoInterval")
  };

  const hasWidget = Boolean(el.status && el.address && el.hint);
  const hasInbox = Boolean(el.mailList && el.inboxPath);

  let provider = null;
  let activeBase = null;
  let currentAddress = "";
  let typeTimer = null;
  let pollTimer = null;
  let polling = false;
  let lastMailFingerprint = "";
  const mailUiState = new Map();

  function pollIntervalMs() {
    if (activeBase === LOCAL_BASE) return 6000;
    if (activeBase === "cloud") return 15000;
    return 9000;
  }

  function updateMetaInfo() {
    const seconds = Math.round(pollIntervalMs() / 1000);
    if (el.metaInfo) {
      el.metaInfo.innerHTML =
        '<i class="ph ph-shield-check" aria-hidden="true"></i> ' +
        t("d.meta", { s: seconds });
    }
    if (el.bentoInterval) el.bentoInterval.textContent = `${seconds}s`;
  }

  /* ---------- transport ---------- */

  async function fetchJson(url, options = {}, timeoutMs = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return await res.json().catch(() => null);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function setProviderBadge(mode) {
    if (!el.providerBadge) return;
    el.providerBadge.textContent =
      mode === "local" ? "RELAY:LOCAL" : mode === "edge" ? "RELAY:EDGE" : "RELAY:CLOUD";
    el.providerBadge.classList.toggle("local", mode !== "relay");
  }

  function sameOriginBase() {
    return `${location.origin}/api`;
  }

  async function detectProvider() {
    const isLocalHost = ["127.0.0.1", "localhost"].includes(location.hostname);
    const bases = isLocalHost ? [LOCAL_BASE, sameOriginBase()] : [sameOriginBase(), LOCAL_BASE];

    for (const base of bases) {
      const st = await fetchJson(`${base}/status`, {}, 2500);
      if (st && st.status === "online") {
        activeBase = base;
        break;
      }
    }
    if (!activeBase) activeBase = "cloud";

    setProviderBadge(
      activeBase === LOCAL_BASE ? "local" : activeBase === "cloud" ? "relay" : "edge"
    );

    updateMetaInfo();
  }

  async function createAddress() {
    if (activeBase && activeBase !== "cloud") {
      const json = await fetchJson(`${activeBase}/generate`);
      if (json && json.status === "success" && json.data?.email) {
        return { email: json.data.email };
      }
    }
    return { error: t("d.relayError") };
  }

  function qs(params) {
    return new URLSearchParams(params).toString();
  }

  async function fetchInbox(email) {
    if (!activeBase || activeBase === "cloud") return null;
    const json = await fetchJson(`${activeBase}/inbox?${qs({ email })}`);
    if (!json || json.status !== "success") return null;
    const msgs = Array.isArray(json.data?.messages) ? json.data.messages : [];
    return msgs.map((m) => ({
      from: m.from || t("d.unknown"),
      subject: m.subject || t("d.noSubject"),
      time: m.date || "",
      link: m.link || "",
      detail: m.detail
        ? {
            text: m.detail.text || "",
            links: Array.isArray(m.detail.links) ? m.detail.links.slice(0, 10) : [],
            otp: m.detail.otp || null,
            verif: m.detail.verif || null
          }
        : null
    }));
  }

  async function fetchMessageDetail(email, link) {
    const json = await fetchJson(
      `${activeBase}/message?${qs({ email, link })}`
    );
    if (!json || json.status !== "success" || !json.data) return null;
    const d = json.data;
    return {
      text: d.body_text || "",
      links: Array.isArray(d.all_links) ? d.all_links.slice(0, 10) : [],
      otp: d.otp || null,
      verif: d.verification_link || null
    };
  }

  /* ---------- widget ---------- */

  function setStatus(state, label) {
    if (!el.status) return;
    el.status.dataset.state = state;
    el.status.lastChild.textContent = label;
  }

  function setHint(text, tone) {
    el.hint.textContent = text;
    el.hint.classList.remove("ok", "err");
    if (tone) el.hint.classList.add(tone);
  }

  function typeAddress(address, onDone) {
    clearTimeout(typeTimer);
    el.address.textContent = "";

    if (reduceMotion) {
      el.address.textContent = address;
      onDone();
      return;
    }

    let i = 0;
    el.address.classList.add("is-typing");
    const step = () => {
      i += 1;
      el.address.textContent = address.slice(0, i);
      if (i < address.length) {
        typeTimer = setTimeout(step, 24 + Math.random() * 30);
      } else {
        el.address.classList.remove("is-typing");
        onDone();
      }
    };
    typeTimer = setTimeout(step, 120);
  }

  async function generate() {
    stopPolling();
    lastMailFingerprint = "";
    mailUiState.clear();
    el.address.classList.remove("expired");
    el.address.textContent = "";
    if (el.copyBtn) el.copyBtn.disabled = true;
    setStatus("loading", "CONNECTING");
    setHint(t("d.requesting"));

    const result = await createAddress();

    if (!result.email) {
      setStatus("expired", "ERROR");
      setHint(result.error, "err");
      return;
    }

    const email = result.email;
    typeAddress(email, () => {
      if (el.addressLive) el.addressLive.textContent = t("d.addrLivePrefix") + email;
      currentAddress = email;
      if (el.copyBtn) el.copyBtn.disabled = false;
      setStatus("live", "LIVE");
      setHint(t("d.ready"), "ok");
      if (hasInbox) {
        /* path is now dynamic - drop the i18n binding so language
           switches don't clobber the live mailbox path */
        el.inboxPath.removeAttribute("data-i18n");
        el.inboxPath.textContent = `/inbox/${email}`;
        renderEmptyState(t("d.waitFirst"));
        startPolling();
      }
    });
  }

  async function copyAddress() {
    if (!currentAddress) return;
    try {
      await navigator.clipboard.writeText(currentAddress);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = currentAddress;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    const icon = el.copyBtn.querySelector("i");
    icon.className = "ph ph-check";
    el.copyBtn.classList.add("copied");
    setTimeout(() => {
      icon.className = "ph ph-copy";
      el.copyBtn.classList.remove("copied");
    }, 1400);
  }

  /* ---------- inbox ---------- */

  function setPollStatus(text) {
    if (el.pollStatus) el.pollStatus.textContent = text;
  }

  function renderEmptyState(text) {
    el.mailList.replaceChildren();
    const li = document.createElement("li");
    li.className = "mail-empty";
    const icon = document.createElement("i");
    icon.className = "ph ph-tray";
    icon.setAttribute("aria-hidden", "true");
    const span = document.createElement("span");
    span.textContent = text;
    li.append(icon, span);
    el.mailList.appendChild(li);
  }

  function buildLinkList(container, urls) {
    if (!urls.length) return;
    const label = document.createElement("p");
    label.className = "mail-links-label mono";
    label.textContent = t("d.linksFound", { n: urls.length });
    container.appendChild(label);
    const ul = document.createElement("ul");
    ul.className = "mail-links";
    urls.forEach((href) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer nofollow";
      a.textContent = href;
      li.appendChild(a);
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }

  function fillDetail(detailEl, detail) {
    detailEl.replaceChildren();

    if (detail.otp) {
      const chip = document.createElement("span");
      chip.className = "otp-chip mono";
      chip.textContent = `OTP ${detail.otp}`;
      detailEl.appendChild(chip);
    }

    if (detail.verif) {
      const wrap = document.createElement("a");
      wrap.className = "verif-btn";
      wrap.href = detail.verif;
      wrap.target = "_blank";
      wrap.rel = "noopener noreferrer nofollow";
      const icon = document.createElement("i");
      icon.className = "ph ph-seal-check";
      icon.setAttribute("aria-hidden", "true");
      wrap.append(icon, document.createTextNode(t("d.openVerif")));
      detailEl.appendChild(wrap);
    }

    if (detail.text) {
      const body = document.createElement("p");
      body.className = "mail-body";
      body.textContent = detail.text.slice(0, 1200);
      detailEl.appendChild(body);
    }

    buildLinkList(detailEl, detail.links.filter((u) => u !== detail.verif));

    if (!detailEl.childNodes.length) {
      const none = document.createElement("p");
      none.className = "mail-body";
      none.textContent = "No readable content in this message.";
      detailEl.appendChild(none);
    }
  }

  function mailKey(message) {
    return `${message.from}|${message.subject}|${message.time}|${message.link || ""}`;
  }

  function buildMailRow(message, index) {
    const key = mailKey(message);

    if (!mailUiState.has(key)) {
      mailUiState.set(key, { open: false, detail: message.detail || null });
    } else if (message.detail && !mailUiState.get(key).detail) {
      mailUiState.get(key).detail = message.detail;
    }

    const state = mailUiState.get(key);
    const loaded = Boolean(state.detail && (state.detail.text || state.detail.links?.length));

    const li = document.createElement("li");
    li.className = "mail-row";

    const sender = document.createElement("span");
    sender.className = "mail-sender mono";
    sender.textContent = message.from;

    const subject = document.createElement("span");
    subject.className = "mail-subject";
    subject.textContent = message.subject;

    const tag = document.createElement("span");
    tag.className = "mail-tag tag-ok mono";
    tag.textContent = `#${index + 1}`;

    const time = document.createElement("span");
    time.className = "mail-time mono";
    time.textContent = message.time;

    const toggle = document.createElement("button");
    toggle.className = "icon-btn mail-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", t("d.showMsg", { n: index + 1 }));
    const eyeIcon = document.createElement("i");
    eyeIcon.className = "ph ph-caret-down";
    eyeIcon.setAttribute("aria-hidden", "true");
    toggle.appendChild(eyeIcon);

    const detail = document.createElement("div");
    detail.className = "mail-detail";

    if (state.open) {
      li.classList.add("open");
      toggle.setAttribute("aria-expanded", "true");
      eyeIcon.className = "ph ph-caret-up";
      if (loaded) fillDetail(detail, state.detail);
    }

    toggle.addEventListener("click", async () => {
      const open = li.classList.toggle("open");
      state.open = open;
      toggle.setAttribute("aria-expanded", String(open));
      eyeIcon.className = open ? "ph ph-caret-up" : "ph ph-caret-down";

      if (!open || loaded) return;

      if (state.detail) {
        fillDetail(detail, state.detail);
        return;
      }

      if (activeBase && activeBase !== "cloud" && message.link && currentAddress) {
        const placeholder = document.createElement("p");
        placeholder.className = "mail-body";
        placeholder.textContent = t("d.loadingMsg");
        detail.appendChild(placeholder);
        const fetched = await fetchMessageDetail(currentAddress, message.link);
        if (fetched) {
          state.detail = fetched;
          message.detail = fetched;
          fillDetail(detail, fetched);
        } else {
          placeholder.textContent = t("d.loadFail");
        }
      } else {
        const none = document.createElement("p");
        none.className = "mail-body";
        none.textContent = t("d.noContent");
        detail.appendChild(none);
      }
    });

    li.append(sender, subject, tag, time, toggle, detail);
    return li;
  }

  async function pollInbox() {
    if (!currentAddress) return;
    setPollStatus(t("d.checking"));

    const messages = await fetchInbox(currentAddress);

    if (!messages) {
      setPollStatus(t("d.offline"));
      return;
    }

    if (!messages.length) {
      if (!el.mailList.querySelector(".mail-row")) {
        renderEmptyState(t("d.emptyInbox"));
      }
      const seconds = Math.round(pollIntervalMs() / 1000);
      setPollStatus(t("d.nextCheck", { n: 0, s: seconds }));
      return;
    }

    const fingerprint = messages.map(mailKey).join("::");
    if (fingerprint === lastMailFingerprint && el.mailList.querySelector(".mail-row")) {
      setPollStatus(t("d.liveCount", { n: messages.length }));
      return;
    }
    lastMailFingerprint = fingerprint;

    el.mailList.replaceChildren();
    messages.forEach((m, i) => el.mailList.appendChild(buildMailRow(m, i)));
    setPollStatus(t("d.liveCount", { n: messages.length }));
  }

  function startPolling() {
    stopPolling();
    polling = true;
    pollInbox();
    pollTimer = setInterval(() => {
      if (document.hidden || !polling) return;
      pollInbox();
    }, pollIntervalMs());
  }

  function stopPolling() {
    polling = false;
    clearInterval(pollTimer);
    setPollStatus("");
  }

  /* ---------- wiring ---------- */

  document.querySelectorAll(".js-generate").forEach((btn) => {
    btn.addEventListener("click", () => {
      generate();
      if (!el.widget) return;
      const rect = el.widget.getBoundingClientRect();
      if (rect.top > window.innerHeight || rect.bottom < 0) {
        el.widget.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      }
    });
  });

  if (hasWidget && el.regenBtn) el.regenBtn.addEventListener("click", generate);
  if (hasWidget && el.copyBtn) el.copyBtn.addEventListener("click", copyAddress);

  if (hasInbox && el.refreshInbox) {
    el.refreshInbox.addEventListener("click", () => {
      if (!currentAddress) return;
      const btn = el.refreshInbox;
      btn.classList.remove("spinning");
      void btn.offsetWidth;
      btn.classList.add("spinning");
      setTimeout(() => btn.classList.remove("spinning"), 650);
      pollInbox();
    });
  }

  document.querySelectorAll(".lang-toggle button[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (window.NoisyI18n) window.NoisyI18n.setLang(btn.dataset.lang);
    });
  });

  /* keep JS-generated strings in sync after a language switch */
  window.addEventListener("noisy:lang", () => {
    updateMetaInfo();
    if (currentAddress) pollInbox();
  });

  if (el.navToggle && el.navLinks) {
    el.navToggle.addEventListener("click", () => {
      const open = el.navLinks.classList.toggle("open");
      el.navToggle.setAttribute("aria-expanded", String(open));
    });

    el.navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        el.navLinks.classList.remove("open");
        el.navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const revealEls = document.querySelectorAll(".reveal");
  revealEls.forEach((node, index) => {
    node.style.setProperty("--reveal-delay", `${(index % 4) * 0.08}s`);
  });

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((node) => io.observe(node));
  } else {
    revealEls.forEach((node) => node.classList.add("visible"));
  }

  (async () => {
    await detectProvider();
    if (hasWidget) setTimeout(generate, reduceMotion ? 100 : 600);
  })();

  /* ---------- visitor beacon ---------- */

  function initTracking() {
    if (["127.0.0.1", "localhost"].includes(location.hostname)) return;
    const page = location.pathname.replace(/[^a-z0-9\-_]/gi, "").slice(0, 24) || "home";
    const params = new URLSearchParams({ page, ref: document.referrer || "" });
    const url = `${location.origin}/api/track?${params}`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url);
    } else {
      fetch(url, { keepalive: true }).catch(() => {});
    }
  }

  initTracking();

  /* ---------- preloader (once per tab session) ---------- */

  function initPreloader() {
    const pre = $("preloader");
    if (!pre) {
      document.body.classList.add("ready");
      return;
    }

    let finished = false;
    const finish = (instant) => {
      if (finished) return;
      finished = true;
      try { sessionStorage.setItem("nm_intro", "1"); } catch (_) {}
      document.body.classList.remove("loading");
      document.body.classList.add("ready");
      pre.classList.add("done");
      setTimeout(() => pre.remove(), instant ? 0 : 750);
    };

    if (reduceMotion) {
      finish(true);
      return;
    }

    let seen = false;
    try { seen = Boolean(sessionStorage.getItem("nm_intro")); } catch (_) {}
    if (seen) {
      finish(true);
      return;
    }

    document.body.classList.add("loading");

    const title = pre.querySelector(".preloader-title");
    if (title) {
      const text = title.textContent;
      title.textContent = "";
      [...text].forEach((ch, i) => {
        const span = document.createElement("span");
        span.className = "pt-char";
        span.style.setProperty("--i", String(i));
        span.textContent = ch === " " ? "\u00A0" : ch;
        title.appendChild(span);
      });
    }

    const statusEl = pre.querySelector(".preloader-status");
    const phrases = [
      t("d.pre1"),
      t("d.pre2"),
      t("d.pre3"),
      t("d.pre4")
    ];
    let phraseIndex = 0;
    const statusTimer = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      if (statusEl) statusEl.textContent = phrases[phraseIndex];
      if (phraseIndex === phrases.length - 1) clearInterval(statusTimer);
    }, 550);

    const t0 = performance.now();
    const minDisplay = 1900;

    const hide = () => {
      if (finished) return;
      const wait = Math.max(0, minDisplay - (performance.now() - t0));
      setTimeout(() => {
        clearInterval(statusTimer);
        finish(false);
      }, wait);
    };

    if (document.readyState === "complete") hide();
    else window.addEventListener("load", hide);
    setTimeout(hide, 3200);
  }

  initPreloader();
})();
