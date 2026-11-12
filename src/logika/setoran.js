// Setoran = baris SETOR + (untuk tahap JAHIT/FINISHING) QC, dibuat bersamaan secara atomik.

import { TAHAP_QC } from './konstanta.js';
import { galatKonflik, galatValidasi } from './galat.js';
import { pastikanPcs } from './angka.js';
import { validasiSerahTerimaBaru } from './serahTerima.js';
import { validasiQc } from './qc.js';
import { sisaDiTangan } from './selisih.js';

/**
 * data: { orderId, tahap, dariId, lolos?, reject?, pcs? }
 *   tahap QC     → lolos + reject wajib, pcs dihitung
 *   tahap non-QC → pcs wajib, tanpa lolos/reject
 * Mengembalikan { baris, qc } (qc null untuk tahap non-QC).
 */
export function validasiSetoran({ data, admin, penggunaById, orderById, serahTerima, idx }) {
  if (!data || typeof data !== 'object') throw galatValidasi('Data setoran kosong');
  const pakaiQc = TAHAP_QC.includes(data.tahap);
  let qc = null;
  let pcs;
  if (pakaiQc) {
    if (data.pcs !== undefined) throw galatValidasi('Untuk tahap QC, isi jumlah lolos dan reject, bukan pcs');
    qc = validasiQc({ lolos: data.lolos, reject: data.reject });
    pcs = qc.total;
  } else {
    if (data.lolos !== undefined || data.reject !== undefined) throw galatValidasi(`Tahap ${data.tahap} tidak memakai QC`);
    pcs = pastikanPcs(data.pcs);
  }

  const baris = validasiSerahTerimaBaru({
    data: { orderId: data.orderId, tahap: data.tahap, arah: 'SETOR', dariId: data.dariId, keId: admin.id, pcs, catatan: data.catatan },
    penggunaById,
    orderById,
  });

  if (data.terakhir !== undefined && typeof data.terakhir !== 'boolean') throw galatValidasi('Tanda setoran terakhir harus ya/tidak');

  const sisa = sisaDiTangan({ pekerjaId: baris.dariId, orderId: baris.orderId, tahap: baris.tahap }, serahTerima, idx);
  if (pcs > sisa) {
    throw galatKonflik(`Setoran ${pcs} pcs melebihi pcs yang tercatat di tangan pekerja (${Math.max(sisa, 0)} pcs)`);
  }
  return { baris: { ...baris, terakhir: data.terakhir === true }, qc: qc && { lolos: qc.lolos, reject: qc.reject } };
}
