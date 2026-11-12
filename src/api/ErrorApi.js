// Galat dari API (mock maupun backend asli). Halaman cukup membaca .pesan dan .kode.
export class ErrorApi extends Error {
  constructor(status, kode, pesan, detail = []) {
    super(pesan);
    this.name = 'ErrorApi';
    this.status = status;
    this.kode = kode;
    this.pesan = pesan;
    this.detail = detail;
  }
}

export const STATUS_DARI_KODE = Object.freeze({
  VALIDASI: 400,
  TIDAK_MASUK: 401,
  TIDAK_BOLEH: 403,
  TIDAK_DITEMUKAN: 404,
  KONFLIK: 409,
});
