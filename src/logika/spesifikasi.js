// Spesifikasi berversi (rancangan 4.5).
//   spesifikasi_versi { id, orderId, nomor, isi, perubahan: [field], diterbitkanOleh, pada }
//   persetujuan_spek  { id, spekVersiId, hasil, catatan, pada }
//   isi = { model, bahan, warna, logo, ukuran: { S: 10, M: 30, ... }, catatan, fotoSampel }

import { FIELD_SPEK, HASIL_PERSETUJUAN } from './konstanta.js';
import { galatKonflik, galatTidakDitemukan, galatValidasi, invarian } from './galat.js';
import { pastikanPcs, pastikanSalahSatu, pastikanTeks } from './angka.js';

const POLA_UKURAN = /^[A-Z0-9]{1,6}$/;

/** Bersihkan isi spesifikasi. Σ ukuran wajib sama dengan jumlah order. */
export function validasiIsiSpek(isi, order) {
  if (!isi || typeof isi !== 'object') throw galatValidasi('Isi spesifikasi kosong');
  for (const k of Object.keys(isi)) if (!FIELD_SPEK.includes(k)) throw galatValidasi(`Field spesifikasi tidak dikenal: ${k}`);
  const ukuranMentah = isi.ukuran;
  if (!ukuranMentah || typeof ukuranMentah !== 'object' || Array.isArray(ukuranMentah)) throw galatValidasi('Rincian ukuran wajib diisi');
  const ukuran = {};
  for (const [label, n] of Object.entries(ukuranMentah)) {
    const l = String(label).trim().toUpperCase();
    if (!POLA_UKURAN.test(l)) throw galatValidasi(`Label ukuran tidak valid: ${label}`);
    if (l in ukuran) throw galatValidasi(`Ukuran ${l} ditulis dua kali`);
    ukuran[l] = pastikanPcs(n, `Jumlah ukuran ${l}`);
  }
  const total = Object.values(ukuran).reduce((a, n) => a + n, 0);
  if (total !== order.jumlah) throw galatValidasi(`Total ukuran ${total} pcs, padahal order ${order.jumlah} pcs`);
  return {
    model: pastikanTeks(isi.model, 'Model'),
    bahan: pastikanTeks(isi.bahan, 'Bahan', { wajib: false }),
    warna: pastikanTeks(isi.warna, 'Warna', { wajib: false }),
    logo: pastikanTeks(isi.logo, 'Logo', { wajib: false }),
    ukuran,
    catatan: pastikanTeks(isi.catatan, 'Catatan', { wajib: false }),
    fotoSampel: pastikanTeks(isi.fotoSampel, 'Foto sampel', { wajib: false, maks: 500 }),
  };
}

const kanonik = (nilai) =>
  nilai && typeof nilai === 'object' ? JSON.stringify(Object.keys(nilai).sort().map((k) => [k, nilai[k]])) : JSON.stringify(nilai ?? null);

export function bedaField(lama, baru) {
  return FIELD_SPEK.filter((f) => kanonik(lama[f]) !== kanonik(baru[f]));
}

export function versiOrder(versiSpek, orderId) {
  const hasil = versiSpek.filter((v) => v.orderId === orderId).sort((a, b) => a.nomor - b.nomor);
  hasil.forEach((v, i) => invarian(v.nomor === i + 1, `nomor versi order ${orderId} tidak berurutan`));
  return hasil;
}

/** Versi baru: nomor = terakhir + 1; perubahan dihitung sendiri, tidak dipercaya dari klien. */
export function validasiVersiBaru({ order, isi, versiSpek }) {
  if (!order) throw galatTidakDitemukan('Order');
  const bersih = validasiIsiSpek(isi, order);
  const ada = versiOrder(versiSpek, order.id);
  if (ada.length === 0) return { orderId: order.id, nomor: 1, isi: bersih, perubahan: [] };
  const terakhir = ada.at(-1);
  const perubahan = bedaField(terakhir.isi, bersih);
  if (perubahan.length === 0) throw galatValidasi('Tidak ada yang berubah dari versi sebelumnya');
  return { orderId: order.id, nomor: terakhir.nomor + 1, isi: bersih, perubahan };
}

function jawabanUntuk(persetujuanSpek, versiId) {
  const j = persetujuanSpek.filter((p) => p.spekVersiId === versiId);
  invarian(j.length <= 1, `versi ${versiId} dijawab lebih dari sekali`);
  return j[0] ?? null;
}

/** DISETUJUI | MINTA_UBAH | MENUNGGU (versi terbaru belum dijawab) | DIGANTIKAN (versi lama belum dijawab). */
export function statusVersi(versi, versiSpek, persetujuanSpek) {
  const j = jawabanUntuk(persetujuanSpek, versi.id);
  if (j) return j.hasil;
  const terbaru = versiOrder(versiSpek, versi.orderId).at(-1);
  return terbaru.id === versi.id ? 'MENUNGGU' : 'DIGANTIKAN';
}

/** Versi yang diikuti produksi: disetujui dengan nomor terbesar, atau null. */
export function versiDisetujuiTerakhir(orderId, versiSpek, persetujuanSpek) {
  const disetujui = versiOrder(versiSpek, orderId).filter((v) => jawabanUntuk(persetujuanSpek, v.id)?.hasil === 'DISETUJUI');
  return disetujui.at(-1) ?? null;
}

/** Pembeli hanya bisa menjawab versi terbaru yang belum dijawab. */
export function validasiPersetujuan({ versi, versiSpek, persetujuanSpek, hasil, catatan }) {
  if (!versi) throw galatTidakDitemukan('Versi spesifikasi');
  const terbaru = versiOrder(versiSpek, versi.orderId).at(-1);
  if (terbaru.id !== versi.id) throw galatKonflik('Versi ini sudah digantikan versi yang lebih baru');
  if (jawabanUntuk(persetujuanSpek, versi.id)) throw galatKonflik('Versi ini sudah dijawab');
  pastikanSalahSatu(hasil, HASIL_PERSETUJUAN, 'Jawaban');
  const catatanBersih = pastikanTeks(catatan, 'Catatan perubahan', { wajib: hasil === 'MINTA_UBAH' });
  return { spekVersiId: versi.id, hasil, catatan: catatanBersih };
}
