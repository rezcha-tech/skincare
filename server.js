require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check untuk platform hosting (Render, Railway, dll.)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ---------- Helper baca/tulis file JSON sebagai "database" sederhana ----------
const DATA_DIR = path.join(__dirname, 'data');
const FILES = {
  competitors: path.join(DATA_DIR, 'competitors.json'),
  products: path.join(DATA_DIR, 'products.json'),
  notes: path.join(DATA_DIR, 'research-notes.json'),
  news: path.join(DATA_DIR, 'news.json'),
};
const MARKET_OVERVIEW_FILE = path.join(DATA_DIR, 'market-overview.json');

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8');
  return raw.trim() ? JSON.parse(raw) : [];
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function newId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

// ---------- Endpoint: ambil semua data sekaligus (untuk dashboard) ----------
app.get('/api/data', (req, res) => {
  const competitors = readJSON(FILES.competitors).sort(
    (a, b) => (a.popularitas || 999) - (b.popularitas || 999)
  );
  res.json({
    competitors,
    products: readJSON(FILES.products),
    notes: readJSON(FILES.notes),
    news: readJSON(FILES.news),
  });
});

// ---------- Endpoint: ringkasan/ukuran pasar (statis, hasil riset) ----------
app.get('/api/market-overview', (req, res) => {
  if (!fs.existsSync(MARKET_OVERVIEW_FILE)) return res.json({});
  res.json(JSON.parse(fs.readFileSync(MARKET_OVERVIEW_FILE, 'utf-8')));
});

// ---------- CRUD generik untuk 3 jenis data ----------
function setupCrud(routeName, filePath, idPrefix) {
  // Tambah data baru
  app.post(`/api/${routeName}`, (req, res) => {
    const items = readJSON(filePath);
    const item = { id: newId(idPrefix), ...req.body };
    items.push(item);
    writeJSON(filePath, items);
    res.json(item);
  });

  // Edit data
  app.put(`/api/${routeName}/:id`, (req, res) => {
    const items = readJSON(filePath);
    const idx = items.findIndex((i) => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Data tidak ditemukan' });
    items[idx] = { ...items[idx], ...req.body, id: req.params.id };
    writeJSON(filePath, items);
    res.json(items[idx]);
  });

  // Hapus data
  app.delete(`/api/${routeName}/:id`, (req, res) => {
    let items = readJSON(filePath);
    const before = items.length;
    items = items.filter((i) => i.id !== req.params.id);
    writeJSON(filePath, items);
    res.json({ deleted: before !== items.length });
  });
}

setupCrud('competitors', FILES.competitors, 'comp');
setupCrud('products', FILES.products, 'prod');
setupCrud('notes', FILES.notes, 'note');
setupCrud('news', FILES.news, 'news');

// ---------- Endpoint AI: analisa berdasarkan seluruh data riset yang tersimpan ----------
app.post('/api/ai/analyze', async (req, res) => {
  const { pertanyaan } = req.body;
  if (!pertanyaan) return res.status(400).json({ error: 'Pertanyaan wajib diisi' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY belum diatur. Salin .env.example menjadi .env lalu isi API key Anda.',
    });
  }

  const context = {
    kompetitor: readJSON(FILES.competitors),
    produkSendiri: readJSON(FILES.products),
    catatanRiset: readJSON(FILES.notes),
    beritaTren: readJSON(FILES.news),
    ringkasanPasar: fs.existsSync(MARKET_OVERVIEW_FILE)
      ? JSON.parse(fs.readFileSync(MARKET_OVERVIEW_FILE, 'utf-8'))
      : {},
  };

  const systemPrompt = `Kamu adalah analis riset pasar untuk seorang brand owner yang sedang membangun/mengelola brand skincare bayi di Indonesia
(kategori produk seperti pelembab, krim untuk kulit iritasi, sunscreen/SPF, dll).
Gunakan data konteks (kompetitor, produk sendiri, catatan riset, berita & tren, ringkasan pasar) yang diberikan untuk menjawab pertanyaan pengguna secara tajam dan berbasis data.
Jawab dalam Bahasa Indonesia, terstruktur, dan langsung ke poin penting. Jika data konteks kurang untuk menjawab dengan pasti, katakan dengan jujur dan sarankan data apa yang perlu ditambahkan pengguna ke aplikasi ini.`;

  const userMessage = `KONTEKS DATA RISET SAAT INI:
${JSON.stringify(context, null, 2)}

PERTANYAAN PENGGUNA:
${pertanyaan}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gagal memanggil Anthropic API: ${errText}` });
    }

    const data = await response.json();
    const text = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    res.json({ jawaban: text });
  } catch (err) {
    res.status(500).json({ error: `Terjadi kesalahan: ${err.message}` });
  }
});

// ---------- Endpoint AI: cari berita TERBARU kompetitor secara live (pakai web search) ----------
app.post('/api/ai/live-news', async (req, res) => {
  const { topik } = req.body; // contoh: "Moell", "sunscreen bayi", atau kosong = umum
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY belum diatur. Salin .env.example menjadi .env lalu isi API key Anda.',
    });
  }

  const existingBrands = readJSON(FILES.competitors).map((c) => c.nama);

  const query = topik && topik.trim()
    ? topik.trim()
    : `brand skincare bayi Indonesia (seperti ${existingBrands.slice(0, 5).join(', ')})`;

  const systemPrompt = `Kamu adalah analis riset pasar untuk brand owner skincare bayi di Indonesia.
Tugasmu: cari dan rangkum berita/tren TERBARU (utamakan beberapa bulan terakhir) tentang peluncuran produk baru,
kandungan/bahan aktif yang dipakai, dan alasan sesuatu jadi viral (endorsement, live selling, harga, klaim, dsb)
dari brand-brand skincare bayi/anak di Indonesia. Gunakan tool pencarian web untuk memastikan info terkini.
Jawab dalam Bahasa Indonesia, dalam format list per brand/berita, dengan poin: Brand, Apa yang terjadi, Kandungan (jika ada),
Kenapa viral/menonjol (jika relevan), dan sumber/tanggal jika tersedia. Jujur jika info tidak ditemukan.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Cari berita/tren terbaru tentang: ${query}. Fokus pada: produk baru apa yang diluncurkan, kandungan apa yang dipakai, dan kenapa itu viral/laris.`,
          },
        ],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gagal memanggil Anthropic API: ${errText}` });
    }

    const data = await response.json();
    const text = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    res.json({ jawaban: text || 'Tidak ada hasil teks yang bisa ditampilkan.' });
  } catch (err) {
    res.status(500).json({ error: `Terjadi kesalahan: ${err.message}` });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Server berjalan di http://${HOST}:${PORT}`);
});
