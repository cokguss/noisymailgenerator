<div align="center">

# Noisy Mail Generator

**Disposable email sekali klik — loud address, silent inbox**

Generate · Receive · Burn

[![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-f7df1e?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![CSS](https://img.shields.io/badge/CSS-3-1572b6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Node](https://img.shields.io/badge/Node-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/Penggunaan-pribadi-a855f7)](LICENSE.md)

</div>

---

## ✨ Fitur

| Fitur | Kemampuan |
|-------|-----------|
| **Instant generate** | Alamat email aktif seketika begitu halaman terbuka — tanpa formulir, tanpa daftar akun |
| **Live inbox** | Pesan masuk muncul otomatis via polling adaptif (6–15 detik sesuai kualitas koneksi) |
| **Deteksi OTP & verifikasi** | Kode OTP dan tautan verifikasi diekstrak otomatis dari isi pesan (paham pola Indonesia & Inggris) |
| **Dua bahasa** | Toggle Indonesia ⇄ English langsung dari navbar, tersimpan di browser |
| **Detail pesan instan** | Isi pesan, OTP, dan semua link dikirim sekaligus dalam satu respons — klik langsung terbuka |

**Fitur umum**

- 🖥️ Tema *dark terminal* dengan preloader, efek typewriter, dan scroll reveal
- 🔒 *Receive-only* by design — deliverability tinggi, penyalahgunaan nyaris nol
- 📊 Statistik pengunjung ramah privasi — IP di-*hash* harian (SHA256 + salt), tanpa cookie
- ♿ Aksesibilitas diperhatikan: `aria-live`, `prefers-reduced-motion`, navigasi keyboard
- 🚀 Satu proses untuk semuanya — landing page + API dalam satu container

## 🚀 Menjalankan Secara Lokal

**Prasyarat:** Node.js 18+

```bash
# 1. Install dependensi
npm install

# 2. Jalankan (web + mail relay sekaligus)
npm run dev
```

Buka **http://127.0.0.1:5173** — selesai.

> ⚠️ **Penting:** selalu jalankan lewat `npm run dev`.
> Relay API di port 8000 wajib berjalan agar pembuatan alamat dan inbox berfungsi — semua permintaan mail diteruskan ke server, bukan dari browser (apikey tetap aman di sisi server).

### Script yang tersedia

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Static server (5173) + mail relay (8000) sekaligus |
| `npm start` | Mode produksi Node — satu server untuk page + API (port 8000) |
| `npm run cf:dev` | Jalankan Cloudflare Worker di lokal (runtime Workers asli) |
| `npm run cf:deploy` | Deploy ke Cloudflare Workers |
| `npm run server` | Hanya mail relay |
| `npm run web` | Hanya static server |

## 🧠 Cara Kerja

```
Browser ──► Express server (:8000)
   │
   ├── Static: index.html · css · js · assets
   │
   └── /api/*
        ├── /generate ──► CMNTY API  : alamat baru acak-anonim
        ├── /inbox    ──► daftar pesan + detail lengkap per pesan
        ├── /message  ──► isi pesan, OTP, link verifikasi
        ├── /track    ──► beacon kunjungan anonim (IP hashed harian)
        └── /stats    ──► dashboard trafik (dilindungi STATS_KEY)
```

Semua respons mail diproses oleh `EmailParser`: ekstraksi OTP multi-pola (`123-456`, keyword-based, fallback HTML) dan penilaian tautan verifikasi berdasarkan skor kata kunci aksi vs kata kunci yang diabaikan (unsubscribe, sosmed, dsb).

## 📁 Struktur Proyek

```
noisymailgenerator/
├── api/
│   └── _engine.js        # Engine bersama (runtime-agnostic): CmntyMail
│                         # + EmailParser + store statistik — fetch & Web Crypto saja
├── server/
│   ├── server.js         # Express: seluruh API + static file satu container (Node)
│   └── stats-store.js    # Stats store persisten JSON (khusus Node)
├── public/               # Seluruh frontend (di-serve apa adanya, source aman)
│   ├── index.html        # Landing page
│   ├── privacy.html      # Kebijakan Privasi
│   ├── terms.html        # Ketentuan Layanan
│   ├── stats.html        # Dashboard statistik (internal)
│   ├── css/style.css     # Design system gelap ala terminal
│   ├── js/i18n.js        # Kamus ID/EN + penerapan terjemahan
│   ├── js/main.js        # Widget generator, polling inbox, UI
│   └── assets/           # Favicon & avatar
├── worker.js             # Entry Cloudflare Worker (API + assets)
├── wrangler.jsonc        # Konfigurasi Cloudflare
├── scripts/
│   ├── dev.js            # Runner dev (web + relay paralel)
│   └── static.js         # Static server zero-dependency
└── package.json
```

## ☁️ Deploy

### Cloudflare Workers (rekomendasi utama)

Backend di-port penuh ke runtime Workers — `fetch` native + Web Crypto, tanpa dependensi Node:

```bash
npx wrangler login      # sekali saja (buka browser)
npm run cf:deploy       # deploy → https://noisymailgenerator.<subdomain>.workers.dev
```

Static page + API jalan dalam **satu Worker**. Untuk statistik yang persisten antar-deploy, buat KV namespace lalu bind sebagai `STATS_KV` di `wrangler.jsonc` (lihat komentar di file tersebut). Custom domain bisa ditambahkan dari dashboard Cloudflare → Workers → Domains.

### Platform Node (alternatif)

| Platform | Cara |
|----------|------|
| **Railway / Render / Fly.io** | Start command `npm start`, biarkan env `PORT` mengatur port |
| **VPS** | `npm install && npm start` di belakang Nginx/Caddy |

**Environment variables:**

| Variabel | Wajib? | Fungsi |
|----------|--------|--------|
| `PORT` | Opsional (Node) | Port server (default `8000`) |
| `STATS_KEY` | Disarankan | Kunci akses `/api/stats` — tanpa ini default mudah ditebak |
| `CMNTY_API_KEY` | Opsional | Override key API mail tanpa ubah kode |
| `STATS_KV` (binding) | Opsional (Workers) | KV namespace agar statistik persisten antar deploy |

## ⚠️ Catatan

- Beberapa situs memblokir disposable email secara bawaan — itu kebijakan mereka, bukan bug. Gunakan Noisy untuk pendaftaran, unduhan, dan verifikasi sekali pakai yang menerima burner address.
- Alamat bersifat *receive-only* dan bisa didaur ulang jaringan kapan saja — jangan pakai untuk akun penting.
- Bergantung pada API pihak ketiga yang dapat berubah sewaktu-waktu di luar kendali kita.

---

<div align="center">
Dibuat dengan 💜 — <a href="https://github.com/cokguss">cokguss</a>
</div>
