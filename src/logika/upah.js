// Upah borongan (rancangan 4.4).
//
//   pcsDibayar = Σ (lolos + reject yang penyebabnya ≠ tahap pekerja) dari QC setoran di periode
//              + pcs kerja ulang yang diputuskan BAYAR (dihitung di periode keputusan)
//   upah       = Σ pcsDibayar × tarif model order yang berlaku pada tanggal setor
//
//   tarif_versi           { id, modelId, tahap, rupiahPerPcs, berlakuMulai, oleh, pada }
//   kerja_ulang           { id, orderId, pekerjaId, tahap, pcs, spekVersiId, alasan, oleh, pada }
//   keputusan_kerja_ulang { id, kerjaUlangId, bayar, tagihKePembeli, oleh, pada }
//   finalisasi_upah       { id, periode, pekerjaId, pcsDibayar, rupiah, oleh, pada }

import { MAKS_RUPIAH, STATUS_SERAH_TERIMA as S, TAHAP_QC } from './konstanta.js';
import { galatKonflik, galatTidakDitemukan, galatValidasi, invarian } from './galat.js';
import { pastikanPcs, pastikanSalahSatu, pastikanTeks } from './angka.js';
import { awalHariWib, dalamPeriode, pastikanWaktu, rentangPeriode } from './waktu.js';
import { statusSerahTerima } from './serahTerima.js';
import { pisahReject } from './qc.js';

// ---------- tarif ----------

export function tarifBerlaku(tarifVersi, { modelId, tahap, pada }) {
  let pilih = null;
  for (const t of tarifVersi) {
    if (t.modelId !== modelId || t.tahap !== tahap || t.berlakuMulai > pada) continue;
    if (!pilih || t.berlakuMulai >= pilih.berlakuMulai) pilih = t; // sama → yang dicatat belakangan menang
  }
  return pilih;
}

/** Tarif baru tidak boleh berlaku mundur sebelum hari ini (supaya upah yang sudah tercatat tidak berubah). */
export function validasiTarifBaru({ data, modelById, sekarang }) {
  if (!data || typeof data !== 'object') throw galatValidasi('Data tarif kosong');
  if (!modelById.has(data.modelId)) throw galatTidakDitemukan('Model produk');
  const tahap = pastikanSalahSatu(data.tahap, TAHAP_QC, 'Tahap tarif');
  const rupiah = data.rupiahPerPcs;
  if (!Number.isInteger(rupiah) || rupiah < 1 || rupiah > MAKS_RUPIAH) throw galatValidasi('Tarif harus rupiah bulat lebih dari 0');
  const berlakuMulai = pastikanWaktu(data.berlakuMulai, 'Tanggal berlaku');
  if (berlakuMulai < awalHariWib(sekarang)) throw galatValidasi('Tarif tidak boleh berlaku mundur sebelum hari ini');
  return { modelId: data.modelId, tahap, rupiahPerPcs: rupiah, berlakuMulai };
}

// ---------- kerja ulang ----------

export function validasiKerjaUlang({ data, orderById, penggunaById, versiSpek }) {
  if (!data || typeof data !== 'object') throw galatValidasi('Data kerja ulang kosong');
  const order = orderById.get(data.orderId);
  if (!order) throw galatTidakDitemukan('Order');
  const pekerja = penggunaById.get(data.pekerjaId);
  if (!pekerja || pekerja.peran !== 'PEKERJA') throw galatTidakDitemukan('Pekerja');
  const tahap = pastikanSalahSatu(data.tahap, TAHAP_QC, 'Tahap kerja ulang');
  if (!order.tahapan.includes(tahap)) throw galatValidasi(`Order ${order.kode} tidak memakai tahap ${tahap}`);
  const versi = versiSpek.find((v) => v.id === data.spekVersiId);
  if (!versi || versi.orderId !== order.id) throw galatValidasi('Versi spesifikasi tidak cocok dengan order');
  return {
    orderId: order.id,
    pekerjaId: pekerja.id,
    tahap,
    pcs: pastikanPcs(data.pcs),
    spekVersiId: versi.id,
    alasan: pastikanTeks(data.alasan, 'Alasan kerja ulang'),
  };
}

export function validasiKeputusanKerjaUlang({ kerjaUlang, keputusanKerjaUlang, bayar, tagihKePembeli }) {
  if (!kerjaUlang) throw galatTidakDitemukan('Kerja ulang');
  if (keputusanKerjaUlang.some((k) => k.kerjaUlangId === kerjaUlang.id)) throw galatKonflik('Kerja ulang ini sudah diputuskan');
  if (typeof bayar !== 'boolean' || typeof tagihKePembeli !== 'boolean') throw galatValidasi('Keputusan harus ya/tidak');
  return { kerjaUlangId: kerjaUlang.id, bayar, tagihKePembeli };
}

// ---------- rincian & finalisasi ----------

/**
 * Rincian upah satu pekerja untuk satu periode.
 * Baris dengan tarif kosong tetap tampil (rupiah 0) dan didaftar di tarifKosong; finalisasi menolaknya.
 */
export function rincianUpah({ pekerjaId, periode, serahTerima, idx, orderById, tarifVersi, kerjaUlang = [], keputusanKerjaUlang = [] }) {
  rentangPeriode(periode); // validasi format
  const baris = [];

  for (const b of serahTerima) {
    if (b.arah !== 'SETOR' || b.dariId !== pekerjaId || !TAHAP_QC.includes(b.tahap)) continue;
    if (!dalamPeriode(b.dibuatPada, periode) || statusSerahTerima(b, idx) !== S.SAH) continue;
    const qc = idx.qcPer.get(b.id);
    invarian(qc, `setoran ${b.id} tahap ${b.tahap} tanpa QC`);
    const totalReject = qc.reject.reduce((a, r) => a + r.pcs, 0);
    invarian(qc.lolos + totalReject === b.pcs, `QC ${qc.id} tidak sama dengan pcs setoran ${b.id}`);
    const order = orderById.get(b.orderId);
    invarian(order, `order ${b.orderId} hilang`);
    const { dibayar, tidakDibayar } = pisahReject(qc.reject, b.tahap);
    const pcsDibayar = qc.lolos + dibayar;
    const tarif = tarifBerlaku(tarifVersi, { modelId: order.modelId, tahap: b.tahap, pada: b.dibuatPada });
    baris.push({
      sumber: 'SETORAN',
      refId: b.id,
      orderId: order.id,
      tahap: b.tahap,
      pada: b.dibuatPada,
      lolos: qc.lolos,
      rejectDibayar: dibayar,
      rejectTidakDibayar: tidakDibayar,
      pcsDibayar,
      tarif: tarif?.rupiahPerPcs ?? null,
      rupiah: tarif ? pcsDibayar * tarif.rupiahPerPcs : 0,
    });
  }

  const keputusanPer = new Map();
  for (const k of keputusanKerjaUlang) {
    invarian(!keputusanPer.has(k.kerjaUlangId), `kerja ulang ${k.kerjaUlangId} diputuskan lebih dari sekali`);
    keputusanPer.set(k.kerjaUlangId, k);
  }
  for (const ku of kerjaUlang) {
    const k = keputusanPer.get(ku.id);
    if (ku.pekerjaId !== pekerjaId || !k || !k.bayar || !dalamPeriode(k.pada, periode)) continue;
    const order = orderById.get(ku.orderId);
    invarian(order, `order ${ku.orderId} hilang`);
    const tarif = tarifBerlaku(tarifVersi, { modelId: order.modelId, tahap: ku.tahap, pada: ku.pada });
    baris.push({
      sumber: 'KERJA_ULANG',
      refId: ku.id,
      orderId: order.id,
      tahap: ku.tahap,
      pada: k.pada,
      lolos: 0,
      rejectDibayar: 0,
      rejectTidakDibayar: 0,
      pcsDibayar: ku.pcs,
      tarif: tarif?.rupiahPerPcs ?? null,
      rupiah: tarif ? ku.pcs * tarif.rupiahPerPcs : 0,
    });
  }

  baris.sort((a, b) => a.pada - b.pada);
  const pcsDibayar = baris.reduce((a, r) => a + r.pcsDibayar, 0);
  const rupiah = baris.reduce((a, r) => a + r.rupiah, 0);
  invarian(Number.isSafeInteger(rupiah), 'total upah di luar batas bilangan bulat');
  return { pekerjaId, periode, baris, pcsDibayar, rupiah, tarifKosong: baris.filter((r) => r.tarif === null) };
}

/**
 * Syarat finalisasi: periode sudah lewat, belum pernah difinalkan, semua tarif ada,
 * dan tidak ada serah terima ke pekerja itu di periode tsb yang masih MENUNGGU.
 */
export function validasiFinalisasi({ periode, pekerja, rincian, finalisasiUpah, serahTerima, idx, sekarang }) {
  if (!pekerja || pekerja.peran !== 'PEKERJA') throw galatTidakDitemukan('Pekerja');
  invarian(rincian.pekerjaId === pekerja.id && rincian.periode === periode, 'rincian bukan milik pekerja/periode ini');
  const { selesai } = rentangPeriode(periode);
  if (sekarang < selesai) throw galatKonflik('Periode ini belum selesai');
  if (finalisasiUpah.some((f) => f.periode === periode && f.pekerjaId === pekerja.id)) {
    throw galatKonflik('Upah periode ini sudah difinalkan');
  }
  if (rincian.tarifKosong.length > 0) throw galatKonflik('Ada setoran yang tarifnya belum diatur');
  const menunggu = serahTerima.filter(
    (b) => b.arah === 'KELUAR' && b.keId === pekerja.id && dalamPeriode(b.dibuatPada, periode) && statusSerahTerima(b, idx) === S.MENUNGGU,
  );
  if (menunggu.length > 0) throw galatKonflik(`Masih ada ${menunggu.length} serah terima yang belum dikonfirmasi ${pekerja.nama}`);
  return { periode, pekerjaId: pekerja.id, pcsDibayar: rincian.pcsDibayar, rupiah: rincian.rupiah };
}
