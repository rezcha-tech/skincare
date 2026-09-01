# Baby Skincare Market Insight

Aplikasi analisa pasar untuk skincare bayi (pelembab, krim kulit iritasi, SPF, dll) di Indonesia.
Sudah diisi riset awal 11 brand kompetitor nyata (Moell, Purela, Loluna, Cussons, Johnson's, My Baby,
Zwitsal, Mustela, Sebamed, GENTLY Baby, Beeme) lengkap harga, pangsa pasar e-commerce, kandungan, dan
aktivitas sosial media — diurutkan dari yang paling populer. Kamu bisa menambah data sendiri, mencatat
rencana produk brand kamu, dan bertanya ke AI (Claude) untuk analisa berbasis data tersebut.

## Fitur
- **Ringkasan Pasar**: ukuran pasar, pertumbuhan, pendorong pasar, dan tren 2026 (hasil riset web).
- **Kompetitor**: 11 brand pesaing nyata, diurutkan popularitas, lengkap harga, pangsa pasar e-commerce,
  kandungan utama, kekuatan/kelemahan, dan aktivitas sosial media. Bisa tambah/edit brand lain sendiri.
- **Produk Kami**: catat rencana produk brand kamu sendiri (pelembab, krim iritasi, SPF, dll).
- **Catatan Riset**: catat temuan riset bebas (tren pasar, hasil survei, dsb).
- **Berita & Tren**: catatan launching produk baru kompetitor — kandungan yang dipakai & alasan viral.
  Ada tombol **"Cari Berita Terbaru (AI + Web Search)"** yang memakai Claude dengan tool pencarian web
  real-time, jadi kamu bisa cari update terbaru kapan saja, bukan cuma data statis.
- **Analisa AI**: tanya apa saja ke Claude, jawabannya otomatis memakai seluruh data (kompetitor, produk
  kami, catatan riset, berita & tren, ringkasan pasar) sebagai konteks.
- Semua data tersimpan di file JSON lokal (`data/*.json`) — mudah dibuka, diedit manual, atau di-backup.

## Sumber Riset Awal
Data kompetitor & berita di atas dirangkum dari GoodStats Data (analisa Compas), Blibli, Tokopedia,
IDN Times, Tribunshopping, Halodoc, Lemon8, Kompas.tv, Laras Post, TikTok, dan laporan riset pasar
(GII Research, MarkWide Research, Statista) per Agustus 2026. Angka pangsa pasar e-commerce mengacu
pada kategori sunscreen bayi & skincare bayi di Shopee (Q1 2025 & Q1 2026) — bukan representasi
seluruh channel penjualan.

## Cara Menjalankan di VSCode

1. **Extract** file zip ini, lalu buka foldernya di VSCode (`File > Open Folder`).
2. Buka terminal di VSCode (`` Ctrl+` ``), lalu install dependency:
   ```bash
   npm install
   ```
3. Salin file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
   Lalu buka `.env` dan isi `ANTHROPIC_API_KEY` dengan API key kamu dari
   https://console.anthropic.com/settings/keys
   (Tanpa ini, fitur "Analisa AI" tidak akan berfungsi — tapi fitur pencatatan data tetap jalan normal.)
4. Jalankan server:
   ```bash
   npm start
   ```
5. Buka browser ke `http://localhost:3000`

## Struktur Folder
```
skincare-market-app/
├── server.js          # Backend (Express) + endpoint AI
├── public/             # Frontend (dashboard)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── data/                # "Database" — file JSON, otomatis terupdate saat kamu tambah/edit data
│   ├── competitors.json      # 11 brand kompetitor (sudah diriset)
│   ├── products.json         # produk brand kamu sendiri (kosong, siap diisi)
│   ├── research-notes.json
│   ├── news.json             # berita/tren launching produk kompetitor
│   └── market-overview.json  # ukuran pasar & tren 2026
├── .env.example
└── package.json
```

## Menambah Bahan Riset
Semua penambahan data dilakukan lewat tombol "+ Tambah..." di masing-masing tab (Kompetitor, Produk Kami,
Catatan Riset) — tidak perlu edit kode. Data langsung tersimpan ke file JSON di folder `data/` dan langsung
bisa dipakai sebagai konteks oleh AI di tab "Analisa AI".

Kalau kamu mau data awal (seed) diganti, tinggal edit langsung file JSON di folder `data/` sebelum
menjalankan `npm start`.

## Catatan
- Ini aplikasi lokal (jalan di komputer kamu sendiri), datanya tidak terkirim ke mana-mana kecuali saat
  kamu memakai fitur "Analisa AI" (yang mengirim data ke Anthropic API untuk dianalisa).
- Model AI yang dipakai default `claude-sonnet-4-6`, bisa diganti lewat variabel `CLAUDE_MODEL` di `.env`.
