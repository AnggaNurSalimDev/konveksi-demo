import { galatValidasi } from './galat.js';
import { MAKS_PCS, MAKS_TEKS } from './konstanta.js';

/** Pcs: bilangan bulat dalam [min, MAKS_PCS]. */
export function pastikanPcs(nilai, nama = 'Jumlah pcs', { min = 1 } = {}) {
  if (!Number.isInteger(nilai)) throw galatValidasi(`${nama} harus bilangan bulat`);
  if (nilai < min) throw galatValidasi(`${nama} minimal ${min}`);
  if (nilai > MAKS_PCS) throw galatValidasi(`${nama} terlalu besar (maks ${MAKS_PCS})`);
  return nilai;
}

/** Teks wajib: dipangkas, tidak kosong, tidak melebihi batas. */
export function pastikanTeks(nilai, nama, { wajib = true, maks = MAKS_TEKS } = {}) {
  if (nilai === undefined || nilai === null) {
    if (wajib) throw galatValidasi(`${nama} wajib diisi`);
    return null;
  }
  if (typeof nilai !== 'string') throw galatValidasi(`${nama} harus berupa teks`);
  const t = nilai.trim();
  if (wajib && t.length === 0) throw galatValidasi(`${nama} wajib diisi`);
  if (t.length > maks) throw galatValidasi(`${nama} maksimal ${maks} karakter`);
  return t.length === 0 ? null : t;
}

export function pastikanSalahSatu(nilai, daftar, nama) {
  if (!daftar.includes(nilai)) throw galatValidasi(`${nama} tidak dikenal: ${String(nilai)}`);
  return nilai;
}
