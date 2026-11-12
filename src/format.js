// Format tampilan. Semua waktu ditampilkan dalam WIB.

const ZONA = 'Asia/Jakarta';

export const rupiah = (n) => (Number.isFinite(n) ? `Rp ${n.toLocaleString('id-ID')}` : '—');
export const angka = (n) => (Number.isFinite(n) ? n.toLocaleString('id-ID') : '—');

export const tanggal = (ms) =>
  Number.isFinite(ms) ? new Intl.DateTimeFormat('id-ID', { timeZone: ZONA, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(ms) : '—';
export const tanggalPendek = (ms) => (Number.isFinite(ms) ? new Intl.DateTimeFormat('id-ID', { timeZone: ZONA, day: 'numeric', month: 'short' }).format(ms) : '—');
export const jamTanggal = (ms) =>
  Number.isFinite(ms) ? new Intl.DateTimeFormat('id-ID', { timeZone: ZONA, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(ms) : '—';

/** "2026-11-1" → "1–15 Nov 2026" */
export function labelPeriode(p) {
  const m = /^(\d{4})-(\d{2})-([12])$/.exec(p ?? '');
  if (!m) return p ?? '—';
  const bulan = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 15)));
  const akhir = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
  return m[3] === '1' ? `1–15 ${bulan} ${m[1]}` : `16–${akhir} ${bulan} ${m[1]}`;
}

export const LABEL_TAHAP = { POTONG: 'Potong', SABLON: 'Sablon/bordir', JAHIT: 'Jahit', FINISHING: 'Finishing', KIRIM: 'Kirim', SELESAI: 'Selesai' };
export const LABEL_PENYEBAB = { BAHAN: 'Bahan', POTONG: 'Potong', JAHIT: 'Jahit', FINISHING: 'Finishing' };

export const STATUS_DEADLINE = {
  AMAN: ['ok', 'Aman'],
  TERANCAM: ['warn', 'Terancam telat'],
  TERLAMBAT: ['bad', 'Terlambat'],
  BELUM_ADA_DATA: ['wait', 'Belum ada data'],
  SELESAI_PRODUKSI: ['ok', 'Produksi selesai'],
};
export const STATUS_SERAH = {
  MENUNGGU: ['wait', 'Menunggu'],
  SAH: ['ok', 'Dikonfirmasi'],
  DITOLAK: ['bad', 'Ditolak penerima'],
  DIKOREKSI: ['bad', 'Dikoreksi'],
};
export const STATUS_SELISIH = {
  DIKERJAKAN: ['wait', 'Masih dikerjakan'],
  PERLU_DICEK: ['warn', 'Perlu dicek'],
  BERES: ['ok', 'Beres'],
};
export const STATUS_VERSI = {
  DISETUJUI: ['ok', 'Disetujui'],
  MENUNGGU: ['info', 'Menunggu pembeli'],
  MINTA_UBAH: ['warn', 'Pembeli minta ubah'],
  DIGANTIKAN: ['wait', 'Digantikan'],
};

export const LABEL_SPEK = { model: 'Model', bahan: 'Bahan', warna: 'Warna', logo: 'Logo', ukuran: 'Ukuran', catatan: 'Catatan', fotoSampel: 'Foto sampel' };
export const teksUkuran = (u) => (u ? Object.entries(u).map(([k, v]) => `${k} ${v}`).join(' · ') : '—');

/** "S:10, M:30" → { S: 10, M: 30 }; teks tidak valid dikembalikan apa adanya supaya server yang menolak. */
export function bacaUkuran(teks) {
  const hasil = {};
  for (const bagian of String(teks).split(',')) {
    const t = bagian.trim();
    if (!t) continue;
    const m = /^([A-Za-z0-9]+)\s*[:=]?\s*(\d+)$/.exec(t);
    if (!m) return teks;
    hasil[m[1].toUpperCase()] = Number(m[2]);
  }
  return hasil;
}
export const ukuranKeTeks = (u) => (u ? Object.entries(u).map(([k, v]) => `${k}:${v}`).join(', ') : '');
