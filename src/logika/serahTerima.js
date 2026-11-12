// Serah terima (rancangan 4.2). Status TIDAK disimpan: selalu diturunkan dari baris konfirmasi, QC, dan koreksi.
//
//   serahTerima { id, orderId, tahap, arah, dariId, keId, pcs, spekVersiId, koreksiDariId, catatan, dibuatOleh, dibuatPada }
//   konfirmasi  { id, serahTerimaId, oleh, hasil, alasan, atasNamaVendor, pada }

import { ARAH, HASIL_KONFIRMASI, STATUS_SERAH_TERIMA as S, TAHAP } from './konstanta.js';
import { galatKonflik, galatTidakBoleh, galatTidakDitemukan, galatValidasi, invarian } from './galat.js';
import { pastikanPcs, pastikanSalahSatu, pastikanTeks } from './angka.js';

/** Tahap yang dicatat lewat serah terima. KIRIM dicatat lewat pengiriman (progres.js). */
export const TAHAP_SERAH_TERIMA = Object.freeze(TAHAP.filter((t) => t !== 'KIRIM'));

/**
 * Indeks bantu untuk menurunkan status. Sekaligus memeriksa invarian data:
 * maksimal satu konfirmasi, satu QC, dan satu koreksi per baris.
 */
export function buatIndeks({ serahTerima, konfirmasi, qc }) {
  invarian(Array.isArray(serahTerima) && Array.isArray(konfirmasi) && Array.isArray(qc), 'buatIndeks butuh tiga array');
  const byId = new Map();
  for (const b of serahTerima) {
    invarian(!byId.has(b.id), `id serah terima ganda: ${b.id}`);
    byId.set(b.id, b);
  }
  const konfirmasiPer = new Map();
  for (const k of konfirmasi) {
    invarian(byId.has(k.serahTerimaId), `konfirmasi ${k.id} menunjuk baris yang tidak ada`);
    invarian(!konfirmasiPer.has(k.serahTerimaId), `lebih dari satu konfirmasi untuk ${k.serahTerimaId}`);
    konfirmasiPer.set(k.serahTerimaId, k);
  }
  const qcPer = new Map();
  for (const q of qc) {
    invarian(byId.has(q.serahTerimaId), `qc ${q.id} menunjuk baris yang tidak ada`);
    invarian(!qcPer.has(q.serahTerimaId), `lebih dari satu QC untuk ${q.serahTerimaId}`);
    qcPer.set(q.serahTerimaId, q);
  }
  const dikoreksiOleh = new Map();
  for (const b of serahTerima) {
    if (b.koreksiDariId == null) continue;
    invarian(byId.has(b.koreksiDariId), `koreksi ${b.id} menunjuk baris yang tidak ada`);
    invarian(!dikoreksiOleh.has(b.koreksiDariId), `baris ${b.koreksiDariId} dikoreksi lebih dari sekali`);
    dikoreksiOleh.set(b.koreksiDariId, b.id);
  }
  return { byId, konfirmasiPer, qcPer, dikoreksiOleh };
}

export function statusSerahTerima(baris, idx) {
  invarian(idx.byId.get(baris.id) === baris, `baris ${baris.id} bukan bagian dari indeks`);
  if (idx.dikoreksiOleh.has(baris.id)) return S.DIKOREKSI;
  // Setoran dicatat oleh admin, yang sekaligus penerimanya: sah sejak dicatat.
  if (baris.arah === 'SETOR') return S.SAH;
  const k = idx.konfirmasiPer.get(baris.id);
  if (!k) return S.MENUNGGU;
  return k.hasil === 'DITERIMA' ? S.SAH : S.DITOLAK;
}

export const barisSah = (serahTerima, idx) => serahTerima.filter((b) => statusSerahTerima(b, idx) === S.SAH);

/** Pihak pekerja/vendor dari sebuah baris (bukan admin). */
export const pihakPekerja = (baris) => (baris.arah === 'KELUAR' ? baris.keId : baris.dariId);

function pastikanPengguna(penggunaById, id, nama) {
  const p = penggunaById.get(id);
  if (!p) throw galatTidakDitemukan(nama);
  if (p.status !== 'AKTIF') throw galatValidasi(`${nama} (${p.nama}) sudah nonaktif`);
  return p;
}

/**
 * Validasi baris serah terima baru (KELUAR atau SETOR). Mengembalikan isi baris tanpa id/waktu.
 * spekVersiId diisi pemanggil dari versi disetujui terakhir.
 */
export function validasiSerahTerimaBaru({ data, penggunaById, orderById }) {
  if (!data || typeof data !== 'object') throw galatValidasi('Data serah terima kosong');
  const order = orderById.get(data.orderId);
  if (!order) throw galatTidakDitemukan('Order');
  const tahap = pastikanSalahSatu(data.tahap, TAHAP_SERAH_TERIMA, 'Tahap');
  if (!order.tahapan.includes(tahap)) throw galatValidasi(`Order ${order.kode} tidak memakai tahap ${tahap}`);
  const arah = pastikanSalahSatu(data.arah, ARAH, 'Arah');
  const pcs = pastikanPcs(data.pcs);
  if (data.dariId === data.keId) throw galatValidasi('Pemberi dan penerima tidak boleh orang yang sama');
  const dari = pastikanPengguna(penggunaById, data.dariId, 'Pemberi');
  const ke = pastikanPengguna(penggunaById, data.keId, 'Penerima');
  const pihakLuar = ['PEKERJA', 'VENDOR'];
  if (arah === 'KELUAR' && !(dari.peran === 'ADMIN' && pihakLuar.includes(ke.peran))) {
    throw galatValidasi('Serah terima keluar harus dari admin ke pekerja atau vendor');
  }
  if (arah === 'SETOR' && !(pihakLuar.includes(dari.peran) && ke.peran === 'ADMIN')) {
    throw galatValidasi('Setoran harus dari pekerja atau vendor ke admin');
  }
  const catatan = pastikanTeks(data.catatan, 'Catatan', { wajib: false });
  return { orderId: order.id, tahap, arah, dariId: dari.id, keId: ke.id, pcs, catatan, koreksiDariId: null };
}

/**
 * Konfirmasi oleh penerima. Hanya baris KELUAR berstatus MENUNGGU.
 * Penerima VENDOR (tanpa akun) dikonfirmasi admin; barisnya ditandai atasNamaVendor.
 */
export function validasiKonfirmasi({ baris, idx, pelaku, penggunaById, hasil, alasan }) {
  if (!baris) throw galatTidakDitemukan('Serah terima');
  if (baris.arah !== 'KELUAR') throw galatValidasi('Setoran tidak perlu dikonfirmasi');
  const status = statusSerahTerima(baris, idx);
  if (status !== S.MENUNGGU) throw galatKonflik(`Serah terima ini sudah ${status.toLowerCase()}`);
  const penerima = penggunaById.get(baris.keId);
  invarian(penerima, `penerima ${baris.keId} hilang`);
  const atasNamaVendor = penerima.peran === 'VENDOR';
  if (atasNamaVendor ? pelaku.peran !== 'ADMIN' : pelaku.id !== baris.keId) {
    throw galatTidakBoleh('Hanya penerima yang boleh mengonfirmasi');
  }
  pastikanSalahSatu(hasil, HASIL_KONFIRMASI, 'Hasil konfirmasi');
  const alasanBersih = pastikanTeks(alasan, 'Alasan', { wajib: hasil === 'DITOLAK' });
  return { serahTerimaId: baris.id, oleh: pelaku.id, hasil, alasan: alasanBersih, atasNamaVendor };
}

/**
 * Koreksi = baris baru yang menunjuk baris lama (rantai, bukan cabang).
 * Hanya untuk baris KELUAR. Setoran tidak bisa dikoreksi karena sudah terikat QC dan upah.
 */
export function validasiKoreksi({ baris, idx, pcs, alasan }) {
  if (!baris) throw galatTidakDitemukan('Serah terima');
  if (baris.arah !== 'KELUAR') throw galatValidasi('Setoran tidak bisa dikoreksi');
  const status = statusSerahTerima(baris, idx);
  if (status === S.DIKOREKSI) throw galatKonflik('Baris ini sudah dikoreksi; koreksi baris koreksinya');
  const pcsBaru = pastikanPcs(pcs);
  if (pcsBaru === baris.pcs) throw galatValidasi('Jumlah koreksi sama dengan jumlah lama');
  const alasanBersih = pastikanTeks(alasan, 'Alasan koreksi');
  return {
    orderId: baris.orderId,
    tahap: baris.tahap,
    arah: baris.arah,
    dariId: baris.dariId,
    keId: baris.keId,
    pcs: pcsBaru,
    catatan: alasanBersih,
    koreksiDariId: baris.id,
  };
}
