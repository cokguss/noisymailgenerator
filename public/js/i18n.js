(() => {
  "use strict";

  /* ---------- dictionaries (trusted, bundled strings only) ---------- */

  const DICT = {
    en: {
      "nav.inboxDemo": "Inbox demo",
      "nav.features": "Features",
      "nav.how": "How it works",
      "nav.faq": "FAQ",
      "btn.generate": "Generate Address",
      "btn.howSee": "See how it works",
      "pre.status": "initializing secure relay…",
      "hero.h1": 'Loud address.<br /><span class="accent-text">Silent inbox.</span>',
      "hero.sub":
        "Generate a burner address in one click. Sign up anywhere, keep spam out of your real inbox, and walk away anytime.",
      "widget.hint": "establishing secure mailbox…",
      "btn.regen": "Regenerate",
      "widget.caption": "live mailbox — connected to a real temp-mail network",
      "inbox.h2": "Your inbox, in real time.",
      "inbox.sub":
        "Mail sent to your generated address lands here automatically — the page polls the network so you don't have to refresh anything.",
      "inbox.path": "/inbox — generating your address…",
      "inbox.empty": "waiting for your address…",
      "feat.h2": "Built to be thrown away.",
      "feat.sub": "Everything you need from a temp-mail service. Nothing you don't.",
      "feat1.h3": "Instant generation",
      "feat1.p":
        "A fresh, working address the moment the page loads. No forms, no verification loops, no waiting rooms.",
      "feat1.f1": "fresh address ready the moment you land",
      "feat1.f2": "no forms, no verification loops",
      "feat2.h3": "Zero signup",
      "feat2.p": "No account, no password, no personal data. Ever.",
      "feat3.p": "Your inbox refreshes itself automatically while the tab is open.",
      "feat4.h3": "Spam shield",
      "feat4.p": "Junk is filtered before it ever reaches your preview.",
      "feat5.h3": "Developer-first API",
      "feat5.p": "Wire disposable addresses straight into your tests and pipelines.",
      "how.h2": "Three steps. Ten minutes.",
      "step1.h3": "Generate",
      "step1.p": "One click produces a random, anonymous address with its own live mailbox.",
      "step2.h3": "Use it",
      "step2.p": "Paste it into any signup form. Incoming mail appears here within seconds.",
      "step3.h3": "Burn it",
      "step3.p": "Walk away whenever you want. The address dies quietly on its own.",
      "faq.h2": "Questions, answered.",
      "faq.q1": "Is Noisy Mail really free?",
      "faq.a1":
        "Yes. Every feature on this page — generation, inbox preview, expiry — is free and needs no account.",
      "faq.q2": "Can I send email from a generated address?",
      "faq.a2":
        "No. Addresses are receive-only by design. That keeps deliverability high and abuse near zero.",
      "faq.q3": "Why did a site reject my address?",
      "faq.a3":
        "Some sites block disposable emails by default — that's their policy, not a bug. Noisy works everywhere burner addresses are accepted: signups, downloads, one-off verifications, and testing.",
      "faq.q4": "How long does an address live?",
      "faq.a4":
        "Until the upstream mail network recycles the username — that can be minutes or longer. Never rely on a noisy address for anything you need to recover later.",
      "faq.q5": "Should I use it for banking or sensitive accounts?",
      "faq.a5":
        "Please don't. Burner addresses are for signups, downloads, and one-off verifications — not anything you need to recover later.",
      "dev.h2": 'Built by <span class="accent-text">Noisy</span>.',
      "dev.handle": "@cokguss · indie builder",
      "dev.bio":
        "Indie builder making tools that stay out of your way. Noisy Mail Generator is free, accountless, and always will be.",
      "foot.dev": "Developer",
      "foot.privacy": "Privacy Policy",
      "foot.terms": "Terms of Service",
      "foot.note": "© 2026 Noisy Mail Generator · loud address, silent inbox",

      /* dynamic strings used from main.js */
      "d.requesting": "requesting a fresh mailbox from the network…",
      "d.ready": "ready — network: generator.email · mail lands here automatically.",
      "d.relayError":
        "Could not reach the mail relay — start `npm run dev` or deploy the backend, then retry.",
      "d.addrLivePrefix": "Your temporary address is ",
      "d.waitFirst": "waiting for the first message…",
      "d.emptyInbox": "inbox is empty — send something to this address.",
      "d.meta": "receive-only · inbox polls every {s}s",
      "d.checking": "checking…",
      "d.offline": "offline",
      "d.nextCheck": "{n} message(s) · next check {s}s",
      "d.liveCount": "{n} message(s) · live",
      "d.unknown": "(unknown)",
      "d.noSubject": "(no subject)",
      "d.showMsg": "Show message {n}",
      "d.loadingMsg": "loading message…",
      "d.loadFail": "could not load this message.",
      "d.noContent": "No readable content available for this message.",
      "d.linksFound": "{n} link(s) found:",
      "d.openVerif": "Open verification link",
      "d.pre1": "initializing secure relay…",
      "d.pre2": "resolving mail domains…",
      "d.pre3": "arming spam shield…",
      "d.pre4": "ready."
    },

    id: {
      "nav.inboxDemo": "Demo inbox",
      "nav.features": "Fitur",
      "nav.how": "Cara kerja",
      "nav.faq": "FAQ",
      "btn.generate": "Buat Alamat",
      "btn.howSee": "Lihat cara kerja",
      "pre.status": "menyiapkan relay aman…",
      "hero.h1": 'Berisik alamatnya.<br /><span class="accent-text">Senyap inboxnya.</span>',
      "hero.sub":
        "Buat alamat email sementara cukup sekali klik. Daftar di mana saja, jaga inbox aslimu bersih dari spam, dan tinggalkan kapan pun.",
      "widget.hint": "menyiapkan kotak pos aman…",
      "btn.regen": "Buat Ulang",
      "widget.caption": "mailbox sungguhan — tersambung ke jaringan temp-mail asli",
      "inbox.h2": "Inboxmu, secara real-time.",
      "inbox.sub":
        "Email yang dikirim ke alamatmu muncul di sini otomatis — halaman ini memantau jaringannya, jadi kamu tidak perlu refresh apa pun.",
      "inbox.path": "/inbox — sedang membuat alamatmu…",
      "inbox.empty": "menunggu alamatmu…",
      "feat.h2": "Dibuat untuk dibuang.",
      "feat.sub": "Semua yang kamu butuhkan dari layanan email sementara. Tanpa yang tidak perlu.",
      "feat1.h3": "Pembuatan instan",
      "feat1.p":
        "Alamat baru yang benar-benar aktif begitu halaman terbuka. Tanpa formulir, tanpa loop verifikasi, tanpa ruang tunggu.",
      "feat1.f1": "alamat baru siap begitu kamu mendarat",
      "feat1.f2": "tanpa formulir, tanpa loop verifikasi",
      "feat2.h3": "Tanpa daftar akun",
      "feat2.p": "Tanpa akun, tanpa sandi, tanpa data pribadi. Selamanya.",
      "feat3.p": "Inboxmu menyegarkan dirinya sendiri selama tab terbuka.",
      "feat4.h3": "Perisai spam",
      "feat4.p": "Sampah disaring sebelum sempat sampai ke pratinjau kamu.",
      "feat5.h3": "API ramah developer",
      "feat5.p": "Sambungkan email sementara langsung ke pengujian dan pipeline-mu.",
      "how.h2": "Tiga langkah. Sepuluh menit.",
      "step1.h3": "Buat",
      "step1.p": "Satu klik menghasilkan alamat acak anonim, lengkap dengan mailbox aktifnya.",
      "step2.h3": "Pakai",
      "step2.p": "Tempel ke formulir pendaftaran apa pun. Email masuk muncul di sini dalam hitungan detik.",
      "step3.h3": "Buang",
      "step3.p": "Pergi kapan saja. Alamatnya mati sendiri tanpa berisik.",
      "faq.h2": "Pertanyaan, terjawab.",
      "faq.q1": "Apakah Noisy Mail benar-benar gratis?",
      "faq.a1":
        "Ya. Semua fitur di halaman ini — pembuatan alamat, pratinjau inbox, kedaluwarsa — gratis dan tanpa akun.",
      "faq.q2": "Bisakah saya mengirim email dari alamat hasil generate?",
      "faq.a2":
        "Tidak. Alamat hanya bisa menerima, memang sengaja begitu. Ini menjaga deliverability tetap tinggi dan penyalahgunaan nyaris nol.",
      "faq.q3": "Kenapa ada situs yang menolak alamat saya?",
      "faq.a3":
        "Beberapa situs memblokir email sementara secara bawaan — itu kebijakan mereka, bukan bug. Noisy bekerja di semua situs yang menerima burner address: pendaftaran, unduhan, verifikasi sekali pakai, dan testing.",
      "faq.q4": "Berapa lama alamat bertahan?",
      "faq.a4":
        "Sampai jaringan mail upstream mendaur ulang username-nya — bisa hitungan menit atau lebih. Jangan andalkan alamat noisy untuk hal penting yang perlu dipulihkan nanti.",
      "faq.q5": "Bolehkah dipakai untuk banking atau akun sensitif?",
      "faq.a5":
        "Sebaiknya jangan. Alamat sementara itu untuk pendaftaran, unduhan, dan verifikasi sekali pakai — bukan untuk apa pun yang harus bisa kamu pulihkan nanti.",
      "dev.h2": 'Dibuat oleh <span class="accent-text">Noisy</span>.',
      "dev.handle": "@cokguss · builder independen",
      "dev.bio":
        "Builder independen pembuat tools yang tidak ikut campur. Noisy Mail Generator gratis, tanpa akun, dan akan selalu begitu.",
      "foot.dev": "Developer",
      "foot.privacy": "Kebijakan Privasi",
      "foot.terms": "Ketentuan Layanan",
      "foot.note": "© 2026 Noisy Mail Generator · alamat berisik, inbox senyap",

      /* dynamic strings used from main.js */
      "d.requesting": "meminta mailbox baru dari jaringan…",
      "d.ready": "siap — jaringan: generator.email · email masuk otomatis di sini.",
      "d.relayError":
        "Tidak bisa menghubungi relay mail — jalankan `npm run dev` atau deploy backend-nya, lalu coba lagi.",
      "d.addrLivePrefix": "Alamat sementarama adalah ",
      "d.waitFirst": "menunggu pesan pertama…",
      "d.emptyInbox": "inbox masih kosong — kirim sesuatu ke alamat ini.",
      "d.meta": "hanya terima · inbox dicek tiap {s} dtk",
      "d.checking": "memeriksa…",
      "d.offline": "offline",
      "d.nextCheck": "{n} pesan · cek berikutnya {s} dtk",
      "d.liveCount": "{n} pesan · live",
      "d.unknown": "(tidak dikenal)",
      "d.noSubject": "(tanpa subjek)",
      "d.showMsg": "Tampilkan pesan {n}",
      "d.loadingMsg": "memuat pesan…",
      "d.loadFail": "gagal memuat pesan ini.",
      "d.noContent": "Tidak ada konten yang bisa dibaca dari pesan ini.",
      "d.linksFound": "{n} link ditemukan:",
      "d.openVerif": "Buka link verifikasi",
      "d.pre1": "menyiapkan relay aman…",
      "d.pre2": "mengambil domain mail…",
      "d.pre3": "mengaktifkan perisai spam…",
      "d.pre4": "siap."
    }
  };

  /* ---------- state ---------- */

  let lang = "en";
  try {
    const saved = localStorage.getItem("nm_lang");
    if (saved === "en" || saved === "id") {
      lang = saved;
    } else {
      lang = (navigator.language || "").toLowerCase().startsWith("id") ? "id" : "en";
    }
  } catch (_) {
    lang = (navigator.language || "").toLowerCase().startsWith("id") ? "id" : "en";
  }

  /* ---------- api ---------- */

  function t(key, vars) {
    let out = (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        out = out.split(`{${k}}`).join(String(v));
      }
    }
    return out;
  }

  function applyStatic(root) {
    (root || document).querySelectorAll("[data-i18n]").forEach((el) => {
      el.innerHTML = t(el.getAttribute("data-i18n"));
    });
    document.documentElement.setAttribute("lang", lang);
    document.querySelectorAll(".lang-toggle button[data-lang]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
    });
  }

  function setLang(next) {
    if (next !== "en" && next !== "id") return;
    lang = next;
    try {
      localStorage.setItem("nm_lang", lang);
    } catch (_) {}
    applyStatic();
    window.dispatchEvent(new CustomEvent("noisy:lang", { detail: { lang } }));
  }

  window.NoisyI18n = { t, lang: () => lang, setLang, applyStatic };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => applyStatic());
  } else {
    applyStatic();
  }
})();
