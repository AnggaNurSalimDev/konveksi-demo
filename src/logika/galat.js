// Galat logika membawa kode yang sama dengan kontrak API (rancangan 6),
// supaya mock bisa meneruskannya tanpa menerjemahkan ulang.

export const KODE = Object.freeze({
  VALIDASI: 'VALIDASI',
  TIDAK_BOLEH: 'TIDAK_BOLEH',
  TIDAK_DITEMUKAN: 'TIDAK_DITEMUKAN',
  KONFLIK: 'KONFLIK',
});

export class GalatLogika extends Error {
  constructor(kode, pesan, detail = []) {
    if (!Object.values(KODE).includes(kode)) throw new TypeError(`Kode galat tidak dikenal: ${kode}`);
    super(pesan);
    this.name = 'GalatLogika';
    this.kode = kode;
    this.detail = detail;
  }
}

export const galatValidasi = (pesan, detail) => new GalatLogika(KODE.VALIDASI, pesan, detail);
export const galatTidakBoleh = (pesan = 'Anda tidak berwenang melakukan ini') => new GalatLogika(KODE.TIDAK_BOLEH, pesan);
export const galatTidakDitemukan = (apa = 'Data') => new GalatLogika(KODE.TIDAK_DITEMUKAN, `${apa} tidak ditemukan`);
export const galatKonflik = (pesan) => new GalatLogika(KODE.KONFLIK, pesan);

/** Pelanggaran invarian = bug, bukan kesalahan pengguna. */
export function invarian(syarat, pesan) {
  if (!syarat) throw new Error(`Invarian dilanggar: ${pesan}`);
}
