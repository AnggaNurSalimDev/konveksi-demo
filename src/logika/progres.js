// Progres, pengiriman, dan status deadline per order (rancangan 4.4).
//   pengiriman { id, orderId, pcs, oleh, pada }

import { STATUS_SERAH_TERIMA as S } from './konstanta.js';
import { galatKonflik, invarian } from './galat.js';
import { pastikanPcs } from './angka.js';
import { HARI } from './waktu.js';
import { statusSerahTerima } from './serahTerima.js';

/** Tahap QC terakhir yang dipakai order: FINISHING bila ada, selain itu JAHIT. */
export function tahapQcTerakhir(order) {
  if (order.tahapan.includes('FINISHING')) return 'FINISHING';
  invarian(order.tahapan.includes('JAHIT'), `order ${order.id} tanpa tahap JAHIT`);
  return 'JAHIT';
}

/** Kejadian lolos QC di tahap terakhir: [{ pada, lolos }], urut waktu. */
export function kejadianLolos(order, serahTerima, idx) {
  const tahap = tahapQcTerakhir(order);
  const hasil = [];
  for (const b of serahTerima) {
    if (b.orderId !== order.id || b.arah !== 'SETOR' || b.tahap !== tahap) continue;
    if (statusSerahTerima(b, idx) !== S.SAH) continue;
    const qc = idx.qcPer.get(b.id);
    invarian(qc, `setoran ${b.id} tanpa QC`);
    if (qc.lolos > 0) hasil.push({ pada: b.dibuatPada, lolos: qc.lolos });
  }
  return hasil.sort((a, b) => a.pada - b.pada);
}

export function progresOrder(order, kejadian, pengiriman) {
  const lolos = kejadian.reduce((a, k) => a + k.lolos, 0);
  const dikirim = pengiriman.filter((p) => p.orderId === order.id).reduce((a, p) => a + p.pcs, 0);
  invarian(dikirim <= lolos, `order ${order.id}: dikirim ${dikirim} melebihi lolos QC ${lolos}`);
  return { lolos, dikirim, jumlah: order.jumlah, persen: Math.min(100, Math.floor((lolos * 100) / order.jumlah)) };
}

export function validasiPengiriman({ order, pcs, progres }) {
  const n = pastikanPcs(pcs, 'Jumlah dikirim');
  const siap = progres.lolos - progres.dikirim;
  if (n > siap) throw galatKonflik(`Hanya ${siap} pcs lolos QC yang belum dikirim`);
  return { orderId: order.id, pcs: n };
}

/**
 * Status deadline (SEMENTARA, rancangan 4.4).
 *   laju      = lolos dalam jendela ≤ 7 hari terakhir / jumlah hari jendela
 *               (jendela dimulai paling awal dari hari QC pertama, supaya order baru tidak dibagi 7)
 *   butuhHari = ceil(sisa / laju)
 *   TERANCAM bila butuhHari > hari kalender tersisa
 * Sebelum ada QC sama sekali: BELUM_ADA_DATA (tidak bisa mengklaim aman).
 */
export function statusDeadline({ order, kejadian, sekarang }) {
  const lolos = kejadian.reduce((a, k) => a + k.lolos, 0);
  const sisa = order.jumlah - lolos;
  if (sisa <= 0) return { status: 'SELESAI_PRODUKSI', sisa: 0, laju: null, perkiraanSelesai: null };
  const hariTersisa = Math.ceil((order.deadline - sekarang) / HARI);
  if (hariTersisa <= 0) return { status: 'TERLAMBAT', sisa, laju: null, perkiraanSelesai: null };
  if (kejadian.length === 0) return { status: 'BELUM_ADA_DATA', sisa, laju: null, perkiraanSelesai: null };

  const mulaiJendela = Math.max(sekarang - 7 * HARI, kejadian[0].pada);
  const hariJendela = Math.max(1, Math.ceil((sekarang - mulaiJendela) / HARI));
  const lolosJendela = kejadian.filter((k) => k.pada >= mulaiJendela && k.pada <= sekarang).reduce((a, k) => a + k.lolos, 0);
  const laju = lolosJendela / hariJendela;
  if (laju === 0) return { status: 'TERANCAM', sisa, laju: 0, perkiraanSelesai: null };

  const butuhHari = Math.ceil(sisa / laju);
  return {
    status: butuhHari > hariTersisa ? 'TERANCAM' : 'AMAN',
    sisa,
    laju,
    perkiraanSelesai: sekarang + butuhHari * HARI,
  };
}
