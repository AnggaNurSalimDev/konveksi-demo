// QC setoran (rancangan 4.3).
//   qc { id, serahTerimaId, lolos, reject: [{ penyebab, pcs }], oleh, pada }
// Invarian: lolos + Σ reject.pcs = pcs pada baris setor.

import { PENYEBAB } from './konstanta.js';
import { galatValidasi } from './galat.js';
import { pastikanPcs, pastikanSalahSatu } from './angka.js';

/** Mengembalikan { lolos, reject (digabung per penyebab, urut baku), total }. */
export function validasiQc({ lolos, reject = [] }) {
  const lolosBersih = pastikanPcs(lolos, 'Jumlah lolos QC', { min: 0 });
  if (!Array.isArray(reject)) throw galatValidasi('Reject harus berupa daftar');
  const perPenyebab = new Map();
  for (const r of reject) {
    if (!r || typeof r !== 'object') throw galatValidasi('Baris reject tidak valid');
    if (r.penyebab === undefined || r.penyebab === null || r.penyebab === '') {
      throw galatValidasi('Penyebab reject wajib dipilih');
    }
    const penyebab = pastikanSalahSatu(r.penyebab, PENYEBAB, 'Penyebab reject');
    const pcs = pastikanPcs(r.pcs, `Reject ${penyebab}`);
    perPenyebab.set(penyebab, (perPenyebab.get(penyebab) ?? 0) + pcs);
  }
  const rejectBersih = PENYEBAB.filter((p) => perPenyebab.has(p)).map((p) => ({ penyebab: p, pcs: perPenyebab.get(p) }));
  const total = lolosBersih + rejectBersih.reduce((a, r) => a + r.pcs, 0);
  pastikanPcs(total, 'Total setoran');
  return { lolos: lolosBersih, reject: rejectBersih, total };
}

/**
 * Reject tidak dibayar hanya bila penyebabnya tahap yang dikerjakan pekerja itu sendiri (rancangan 4.4).
 * Mengembalikan { dibayar, tidakDibayar } dalam pcs.
 */
export function pisahReject(reject, tahapPekerja) {
  let dibayar = 0;
  let tidakDibayar = 0;
  for (const r of reject) {
    if (r.penyebab === tahapPekerja) tidakDibayar += r.pcs;
    else dibayar += r.pcs;
  }
  return { dibayar, tidakDibayar };
}
