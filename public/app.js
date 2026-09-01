let currentData = { competitors: [], products: [], notes: [], news: [] };
let currentFormType = null;
let editingId = null;

// Definisi field per jenis data (dipakai untuk generate form modal)
const FIELD_DEFS = {
  competitors: [
    { key: 'nama', label: 'Nama Brand', type: 'text' },
    { key: 'popularitas', label: 'Peringkat Popularitas (angka, 1 = paling populer)', type: 'text' },
    { key: 'asal', label: 'Asal Brand (Lokal/Global)', type: 'text' },
    { key: 'kategoriProduk', label: 'Kategori Produk (pisahkan koma)', type: 'text', isList: true },
    { key: 'hargaKisaran', label: 'Kisaran Harga', type: 'text' },
    { key: 'kanalPenjualan', label: 'Kanal Penjualan (pisahkan koma)', type: 'text', isList: true },
    { key: 'pangsaPasarEcommerce', label: 'Pangsa Pasar / Demand E-commerce', type: 'textarea' },
    { key: 'kandunganUtama', label: 'Kandungan Utama (pisahkan koma)', type: 'text', isList: true },
    { key: 'kekuatan', label: 'Kekuatan', type: 'textarea' },
    { key: 'kelemahan', label: 'Kelemahan', type: 'textarea' },
    { key: 'sosialMedia', label: 'Aktivitas & Demand Sosial Media', type: 'textarea' },
    { key: 'catatan', label: 'Catatan Tambahan', type: 'textarea' },
    { key: 'sumber', label: 'Sumber', type: 'text' },
  ],
  products: [
    { key: 'nama', label: 'Nama Produk', type: 'text' },
    { key: 'kategori', label: 'Kategori (Pelembab / Kulit Iritasi / SPF / dll)', type: 'text' },
    { key: 'hargaTarget', label: 'Target Harga', type: 'text' },
    { key: 'targetPasar', label: 'Target Pasar', type: 'text' },
    { key: 'keunggulanKlaim', label: 'Keunggulan / Klaim', type: 'textarea' },
    { key: 'status', label: 'Status (Riset / Formulasi / Siap Launch)', type: 'text' },
    { key: 'catatan', label: 'Catatan Tambahan', type: 'textarea' },
  ],
  notes: [
    { key: 'judul', label: 'Judul', type: 'text' },
    { key: 'isi', label: 'Isi Catatan', type: 'textarea' },
    { key: 'sumber', label: 'Sumber (opsional)', type: 'text' },
    { key: 'tanggal', label: 'Tanggal (opsional)', type: 'text' },
  ],
  news: [
    { key: 'brand', label: 'Nama Brand', type: 'text' },
    { key: 'judul', label: 'Judul Berita', type: 'text' },
    { key: 'tanggal', label: 'Tanggal', type: 'text' },
    { key: 'ringkasan', label: 'Ringkasan', type: 'textarea' },
    { key: 'kandungan', label: 'Kandungan Terkait (pisahkan koma)', type: 'text', isList: true },
    { key: 'alasanViral', label: 'Alasan Viral / Menonjol', type: 'textarea' },
    { key: 'sumber', label: 'Sumber', type: 'text' },
  ],
};

const LIST_LABEL = { competitors: 'Kompetitor', products: 'Produk', notes: 'Catatan', news: 'Berita' };

// ---------- Tab switching ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ---------- Load data ----------
async function loadData() {
  const [dataRes, overviewRes] = await Promise.all([
    fetch('/api/data'),
    fetch('/api/market-overview'),
  ]);
  currentData = await dataRes.json();
  const overview = await overviewRes.json();
  renderAll();
  renderMarketOverview(overview);
}

function renderMarketOverview(ov) {
  const el = document.getElementById('market-overview');
  if (!ov || !ov.ukuranPasar) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="overview-block">
      <h3>📊 Ukuran &amp; Pertumbuhan Pasar</h3>
      <p><b>Ukuran pasar:</b> ${escapeHtml(ov.ukuranPasar)}</p>
      <p><b>Pertumbuhan:</b> ${escapeHtml(ov.pertumbuhan)}</p>
    </div>
    <div class="overview-block">
      <h3>🚀 Pendorong Pasar</h3>
      <ul>${(ov.pendorongPasar || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
    </div>
    <div class="overview-block">
      <h3>🔥 Tren 2026</h3>
      <ul>${(ov.tren2026 || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
      <div class="overview-note">${escapeHtml(ov.catatanMetodologi || '')}</div>
    </div>
  `;
}

function renderAll() {
  document.getElementById('stat-competitors').textContent = currentData.competitors.length;
  document.getElementById('stat-products').textContent = currentData.products.length;
  document.getElementById('stat-notes').textContent = currentData.notes.length;
  document.getElementById('stat-news').textContent = (currentData.news || []).length;

  renderList('competitors');
  renderList('products');
  renderList('notes');
  renderList('news');
}

function renderList(type) {
  const container = document.getElementById(`${type}-list`);
  if (!container) return;
  const items = currentData[type] || [];
  if (!items.length) {
    container.innerHTML = `<p class="hint">Belum ada data ${LIST_LABEL[type].toLowerCase()}. Klik tombol tambah di atas.</p>`;
    return;
  }
  container.innerHTML = items
    .map((item) => {
      const fields = FIELD_DEFS[type];
      const title = item.nama || item.judul || 'Tanpa nama';
      const rankBadge = type === 'competitors' && item.popularitas
        ? `<span class="rank-badge">#${escapeHtml(item.popularitas)}</span>`
        : '';
      const rows = fields
        .filter((f) => !['nama', 'judul', 'popularitas'].includes(f.key))
        .map((f) => {
          const val = item[f.key];
          if (!val || (Array.isArray(val) && !val.length)) return '';
          const display = Array.isArray(val) ? val.join(', ') : val;
          return `<div class="row"><b>${f.label.split('(')[0].trim()}:</b> ${escapeHtml(display)}</div>`;
        })
        .join('');
      return `
        <div class="data-card">
          <div class="card-actions">
            <button onclick="openForm('${type}', '${item.id}')">Edit</button>
            <button onclick="deleteItem('${type}', '${item.id}')">Hapus</button>
          </div>
          <h3>${rankBadge}${escapeHtml(title)}</h3>
          ${rows}
        </div>`;
    })
    .join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ---------- Modal form ----------
function openForm(type, id = null) {
  currentFormType = type;
  editingId = id;
  const item = id ? currentData[type].find((i) => i.id === id) : null;

  document.getElementById('modal-title').textContent = id
    ? `Edit ${LIST_LABEL[type]}`
    : `Tambah ${LIST_LABEL[type]}`;

  const form = document.getElementById('modal-form');
  form.innerHTML = FIELD_DEFS[type]
    .map((f) => {
      const rawVal = item ? item[f.key] : '';
      const val = Array.isArray(rawVal) ? rawVal.join(', ') : (rawVal || '');
      if (f.type === 'textarea') {
        return `<label>${f.label}</label><textarea name="${f.key}" rows="3">${escapeHtml(val)}</textarea>`;
      }
      return `<label>${f.label}</label><input type="text" name="${f.key}" value="${escapeHtml(val)}" />`;
    })
    .join('');

  document.getElementById('modal-overlay').classList.add('active');
}

function closeForm() {
  document.getElementById('modal-overlay').classList.remove('active');
  currentFormType = null;
  editingId = null;
}

async function submitForm() {
  const form = document.getElementById('modal-form');
  const formData = new FormData(form);
  const payload = {};
  FIELD_DEFS[currentFormType].forEach((f) => {
    const raw = formData.get(f.key) || '';
    payload[f.key] = f.isList ? raw.split(',').map((s) => s.trim()).filter(Boolean) : raw;
  });

  const url = editingId ? `/api/${currentFormType}/${editingId}` : `/api/${currentFormType}`;
  const method = editingId ? 'PUT' : 'POST';

  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  closeForm();
  loadData();
}

async function deleteItem(type, id) {
  if (!confirm('Hapus data ini?')) return;
  await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
  loadData();
}

// ---------- AI: Analisa berbasis data tersimpan ----------
async function askAI() {
  const question = document.getElementById('ai-question').value.trim();
  const answerBox = document.getElementById('ai-answer');
  if (!question) return;

  answerBox.textContent = 'Sedang menganalisa...';

  try {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pertanyaan: question }),
    });
    const data = await res.json();
    if (data.error) {
      answerBox.textContent = `⚠️ ${data.error}`;
    } else {
      answerBox.textContent = data.jawaban;
    }
  } catch (err) {
    answerBox.textContent = `⚠️ Gagal menghubungi server: ${err.message}`;
  }
}

// ---------- AI: Cari berita terbaru secara live (web search) ----------
async function searchLiveNews() {
  const topik = document.getElementById('news-search-input').value.trim();
  const box = document.getElementById('news-live-result');
  box.style.display = 'block';
  box.textContent = 'Sedang mencari berita terbaru di web...';

  try {
    const res = await fetch('/api/ai/live-news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topik }),
    });
    const data = await res.json();
    if (data.error) {
      box.textContent = `⚠️ ${data.error}`;
    } else {
      box.textContent = data.jawaban;
    }
  } catch (err) {
    box.textContent = `⚠️ Gagal menghubungi server: ${err.message}`;
  }
}

loadData();
