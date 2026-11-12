// Selisih per pekerja/order/tahap (rancangan 4.4). Hanya baris SAH yang dihitung.
//
//   diterima = Σ pcs KELUAR ke pekerja
//   disetor  = Σ pcs SETOR dari pekerja (lolos + reject)
//   selisih  = diterima − disetor

import { barisSah, pihakPekerja } from './serahTerima.js';

const kunci = (pekerjaId, orderId, tahap) => `${pekerjaId}|${orderId}|${tahap}`;

/** Daftar { pekerjaId, orderId, tahap, diterima, disetor, selisih }, urut stabil. */
export function hitungSelisih(serahTerima, idx) {
  const peta = new Map();
  for (const b of barisSah(serahTerima, idx)) {
    const pekerjaId = pihakPekerja(b);
    const k = kunci(pekerjaId, b.orderId, b.tahap);
    const r = peta.get(k) ?? { pekerjaId, orderId: b.orderId, tahap: b.tahap, diterima: 0, disetor: 0 };
    if (b.arah === 'KELUAR') r.diterima += b.pcs;
    else r.disetor += b.pcs;
    peta.set(k, r);
  }
  return [...peta.values()]
    .map((r) => ({ ...r, selisih: r.diterima - r.disetor }))
    .sort((a, b) => kunci(a.pekerjaId, a.orderId, a.tahap).localeCompare(kunci(b.pekerjaId, b.orderId, b.tahap)));
}

/** Pcs yang masih di tangan pekerja (boleh negatif bila ada salah catat). */
export function sisaDiTangan({ pekerjaId, orderId, tahap }, serahTerima, idx) {
  const r = hitungSelisih(serahTerima, idx).find((x) => x.pekerjaId === pekerjaId && x.orderId === orderId && x.tahap === tahap);
  return r ? r.selisih : 0;
}
