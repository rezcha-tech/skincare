# Deploy ke Internet (Render)

Aplikasi ini sudah disiapkan agar bisa dijalankan oleh hosting Node.js dan diakses dari device/jaringan berbeda.

## Upload ke GitHub

Masukkan `server.js`, `package.json`, `render.yaml`, `.gitignore`, folder `public/`, dan folder `data/` ke repository.

**Jangan upload `.env` atau API key.**

## Deploy dengan Render

1. Login ke Render.
2. Pilih **New > Web Service**.
3. Hubungkan repository GitHub aplikasi ini.
4. Gunakan:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Tambahkan Environment Variable:
   - `ANTHROPIC_API_KEY` = API key Anthropic kamu
   - `CLAUDE_MODEL` = `claude-sonnet-4-6`
6. Deploy.

Setelah selesai, Render akan memberikan URL seperti `https://nama-aplikasi.onrender.com` yang dapat dibuka dari HP/laptop lain, Wi-Fi lain, maupun jaringan seluler.

## Catatan data

Versi ini masih memakai file JSON di folder `data/` sebagai database sederhana. Ini cocok untuk demo/prototype. Pada hosting tertentu, perubahan file dapat hilang ketika service di-redeploy/restart.

Untuk penggunaan produksi, data sebaiknya dipindahkan ke database seperti PostgreSQL. API key tetap harus disimpan sebagai Environment Variable di hosting, bukan di frontend atau GitHub.

## Jalankan lokal

```bash
npm install
```

Salin `.env.example` menjadi `.env`, isi API key, lalu:

```bash
npm start
```

Buka `http://localhost:3000`.
