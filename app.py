import json
import os
import uuid
from pathlib import Path

import requests
import streamlit as st

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

FILES = {
    "competitors": DATA_DIR / "competitors.json",
    "products": DATA_DIR / "products.json",
    "notes": DATA_DIR / "research-notes.json",
    "news": DATA_DIR / "news.json",
}
MARKET_FILE = DATA_DIR / "market-overview.json"

st.set_page_config(page_title="Skincare Market Analysis", page_icon="🧴", layout="wide")

FIELD_DEFS = {
    "competitors": [
        ("nama", "Nama Brand", "text", False),
        ("popularitas", "Peringkat Popularitas (1 = paling populer)", "text", False),
        ("asal", "Asal Brand (Lokal/Global)", "text", False),
        ("kategoriProduk", "Kategori Produk (pisahkan koma)", "text", True),
        ("hargaKisaran", "Kisaran Harga", "text", False),
        ("kanalPenjualan", "Kanal Penjualan (pisahkan koma)", "text", True),
        ("pangsaPasarEcommerce", "Pangsa Pasar / Demand E-commerce", "textarea", False),
        ("kandunganUtama", "Kandungan Utama (pisahkan koma)", "text", True),
        ("kekuatan", "Kekuatan", "textarea", False),
        ("kelemahan", "Kelemahan", "textarea", False),
        ("sosialMedia", "Aktivitas & Demand Sosial Media", "textarea", False),
        ("catatan", "Catatan Tambahan", "textarea", False),
        ("sumber", "Sumber", "text", False),
    ],
    "products": [
        ("nama", "Nama Produk", "text", False),
        ("kategori", "Kategori (Pelembab / Kulit Iritasi / SPF / dll)", "text", False),
        ("hargaTarget", "Target Harga", "text", False),
        ("targetPasar", "Target Pasar", "text", False),
        ("keunggulanKlaim", "Keunggulan / Klaim", "textarea", False),
        ("status", "Status (Riset / Formulasi / Siap Launch)", "text", False),
        ("catatan", "Catatan Tambahan", "textarea", False),
    ],
    "notes": [
        ("judul", "Judul", "text", False),
        ("isi", "Isi Catatan", "textarea", False),
        ("sumber", "Sumber (opsional)", "text", False),
        ("tanggal", "Tanggal (opsional)", "text", False),
    ],
    "news": [
        ("brand", "Nama Brand", "text", False),
        ("judul", "Judul Berita", "text", False),
        ("tanggal", "Tanggal", "text", False),
        ("ringkasan", "Ringkasan", "textarea", False),
        ("kandungan", "Kandungan Terkait (pisahkan koma)", "text", True),
        ("alasanViral", "Alasan Viral / Menonjol", "textarea", False),
        ("sumber", "Sumber", "text", False),
    ],
}
LABELS = {"competitors": "Kompetitor", "products": "Produk", "notes": "Catatan", "news": "Berita"}


def read_json(path, default):
    try:
        if not path.exists():
            return default
        text = path.read_text(encoding="utf-8").strip()
        return json.loads(text) if text else default
    except Exception as exc:
        st.error(f"Gagal membaca {path.name}: {exc}")
        return default


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def load_state():
    return {k: read_json(v, []) for k, v in FILES.items()} | {"market": read_json(MARKET_FILE, {})}


if "data" not in st.session_state:
    st.session_state.data = load_state()


def save_type(kind):
    write_json(FILES[kind], st.session_state.data[kind])


def refresh():
    st.session_state.data = load_state()


def new_id(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def as_text(value):
    if isinstance(value, list):
        return ", ".join(str(x) for x in value)
    return "" if value is None else str(value)


def form_editor(kind, existing=None):
    existing = existing or {}
    payload = {}
    cols = st.columns(2)
    for i, (key, label, typ, is_list) in enumerate(FIELD_DEFS[kind]):
        target = cols[i % 2]
        with target:
            initial = as_text(existing.get(key, ""))
            if typ == "textarea":
                raw = st.text_area(label, value=initial, key=f"{kind}_{key}_{existing.get('id','new')}")
            else:
                raw = st.text_input(label, value=initial, key=f"{kind}_{key}_{existing.get('id','new')}")
            payload[key] = [x.strip() for x in raw.split(",") if x.strip()] if is_list else raw
    return payload


def show_cards(kind):
    items = st.session_state.data[kind]
    if kind == "competitors":
        items = sorted(items, key=lambda x: int(x.get("popularitas", 999)) if str(x.get("popularitas", "")).isdigit() else 999)
    if not items:
        st.info(f"Belum ada data {LABELS[kind].lower()}.")
        return
    for item in items:
        title = item.get("nama") or item.get("judul") or "Tanpa nama"
        rank = f"#{item.get('popularitas')} " if kind == "competitors" and item.get("popularitas") else ""
        with st.expander(f"{rank}{title}"):
            for key, label, _, _ in FIELD_DEFS[kind]:
                value = item.get(key)
                if value not in (None, "", []):
                    st.markdown(f"**{label.split('(')[0].strip()}:** {as_text(value)}")
            c1, c2 = st.columns(2)
            with c1:
                if st.button("✏️ Edit", key=f"edit_{kind}_{item['id']}"):
                    st.session_state[f"editing_{kind}"] = item["id"]
                    st.rerun()
            with c2:
                if st.button("🗑️ Hapus", key=f"delete_{kind}_{item['id']}"):
                    st.session_state.data[kind] = [x for x in items if x["id"] != item["id"]]
                    save_type(kind)
                    st.rerun()


def crud_section(kind):
    editing_id = st.session_state.get(f"editing_{kind}")
    existing = next((x for x in st.session_state.data[kind] if x["id"] == editing_id), None) if editing_id else None
    action_label = f"Edit {LABELS[kind]}" if existing else f"Tambah {LABELS[kind]}"
    with st.expander(f"➕ {action_label}", expanded=bool(existing)):
        with st.form(f"form_{kind}_{editing_id or 'new'}"):
            payload = form_editor(kind, existing)
            submitted = st.form_submit_button("Simpan")
        if submitted:
            if existing:
                existing.update(payload)
                st.session_state.data[kind] = [existing if x["id"] == existing["id"] else x for x in st.session_state.data[kind]]
            else:
                prefix = {"competitors": "comp", "products": "prod", "notes": "note", "news": "news"}[kind]
                st.session_state.data[kind].append({"id": new_id(prefix), **payload})
            save_type(kind)
            st.session_state.pop(f"editing_{kind}", None)
            st.success("Data tersimpan.")
            st.rerun()
    show_cards(kind)


def anthropic_request(payload):
    api_key = None
    try:
        api_key = st.secrets.get("ANTHROPIC_API_KEY")
    except Exception:
        api_key = None
    api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None, "ANTHROPIC_API_KEY belum diatur. Tambahkan di Streamlit Secrets."
    try:
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
            json=payload,
            timeout=120,
        )
        if not response.ok:
            return None, f"Gagal memanggil Anthropic API: {response.text}"
        data = response.json()
        text = "\n".join(block.get("text", "") for block in data.get("content", []) if block.get("type") == "text")
        return text, None
    except Exception as exc:
        return None, f"Terjadi kesalahan: {exc}"


def ai_analyze(question):
    context = {
        "kompetitor": st.session_state.data["competitors"],
        "produkSendiri": st.session_state.data["products"],
        "catatanRiset": st.session_state.data["notes"],
        "beritaTren": st.session_state.data["news"],
        "ringkasanPasar": st.session_state.data["market"],
    }
    system = (
        "Kamu adalah analis riset pasar untuk brand owner skincare bayi di Indonesia. "
        "Gunakan data konteks yang diberikan untuk menjawab tajam dan berbasis data. "
        "Jawab dalam Bahasa Indonesia, terstruktur dan langsung ke poin penting. "
        "Jika data kurang, katakan dengan jujur dan sarankan data yang perlu ditambahkan."
    )
    payload = {
        "model": "claude-sonnet-4-6",
        "max_tokens": 1500,
        "system": system,
        "messages": [{"role": "user", "content": f"KONTEKS DATA RISET:\n{json.dumps(context, ensure_ascii=False, indent=2)}\n\nPERTANYAAN:\n{question}"}],
    }
    return anthropic_request(payload)


def live_news(topic):
    brands = [x.get("nama", "") for x in st.session_state.data["competitors"]]
    query = topic.strip() if topic.strip() else f"brand skincare bayi Indonesia (seperti {', '.join(brands[:5])})"
    system = (
        "Kamu adalah analis riset pasar untuk brand owner skincare bayi di Indonesia. "
        "Cari dan rangkum berita/tren TERBARU tentang peluncuran produk, kandungan aktif, "
        "dan alasan sesuatu viral/laris. Gunakan tool pencarian web untuk info terkini. "
        "Jawab Bahasa Indonesia dengan Brand, Apa yang terjadi, Kandungan, Kenapa viral, dan sumber/tanggal jika tersedia."
    )
    payload = {
        "model": "claude-sonnet-4-6",
        "max_tokens": 2000,
        "system": system,
        "messages": [{"role": "user", "content": f"Cari berita/tren terbaru tentang: {query}. Fokus pada produk baru, kandungan, dan alasan viral/laris."}],
        "tools": [{"type": "web_search_20250305", "name": "web_search"}],
    }
    return anthropic_request(payload)


st.title("🧴 Skincare Market Analysis")
st.caption("Dashboard riset pasar skincare bayi Indonesia — versi Streamlit")

ov = st.session_state.data["market"]
if ov:
    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("Kompetitor", len(st.session_state.data["competitors"]))
    with c2:
        st.metric("Produk", len(st.session_state.data["products"]))
    with c3:
        st.metric("Berita", len(st.session_state.data["news"]))

    with st.expander("📊 Ringkasan Pasar", expanded=True):
        st.markdown(f"**Ukuran pasar:** {ov.get('ukuranPasar','-')}")
        st.markdown(f"**Pertumbuhan:** {ov.get('pertumbuhan','-')}")
        st.markdown("**Pendorong pasar:**")
        for x in ov.get("pendorongPasar", []):
            st.write("•", x)
        st.markdown("**Tren 2026:**")
        for x in ov.get("tren2026", []):
            st.write("•", x)
        if ov.get("catatanMetodologi"):
            st.caption(ov["catatanMetodologi"])


tabs = st.tabs(["🏠 Dashboard", "🏆 Kompetitor", "🧴 Produk", "📝 Catatan", "📰 Berita", "🤖 AI Analysis", "🔎 Live News"])

with tabs[0]:
    st.subheader("Ringkasan")
    st.write("Gunakan tab di atas untuk mengelola riset, membandingkan kompetitor, dan meminta analisis AI.")
    st.info("Catatan: perubahan data di Streamlit Cloud disimpan selama instance aplikasi berjalan. Untuk penyimpanan permanen lintas restart, nanti kita bisa sambungkan database/GitHub.")

with tabs[1]:
    crud_section("competitors")
with tabs[2]:
    crud_section("products")
with tabs[3]:
    crud_section("notes")
with tabs[4]:
    crud_section("news")
with tabs[5]:
    st.subheader("🤖 Tanya AI berdasarkan data riset")
    question = st.text_area("Pertanyaan", placeholder="Contoh: Dari data ini, strategi apa yang paling masuk akal untuk brand baru?", height=120)
    if st.button("Analisa dengan AI", type="primary"):
        if not question.strip():
            st.warning("Isi pertanyaan terlebih dahulu.")
        else:
            with st.spinner("Sedang menganalisa..."):
                answer, error = ai_analyze(question)
            if error:
                st.error(error)
            else:
                st.markdown(answer)

with tabs[6]:
    st.subheader("🔎 Cari berita/tren terbaru di web")
    topic = st.text_input("Topik/brand (opsional)", placeholder="Contoh: Moell sunscreen bayi")
    if st.button("Cari berita terbaru", type="primary"):
        with st.spinner("Sedang mencari berita terbaru di web..."):
            answer, error = live_news(topic)
        if error:
            st.error(error)
        else:
            st.markdown(answer)
