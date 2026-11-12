// Wewenang per aksi (rancangan 3). Pemeriksaan per baris (mis. "hanya penerima") ada di modul masing-masing.

import { galatTidakBoleh } from './galat.js';

export const AKSI = Object.freeze({
  LIHAT_SEMUA_ORDER: 'LIHAT_SEMUA_ORDER',
  BUAT_ORDER: 'BUAT_ORDER',
  TERBITKAN_SPEK: 'TERBITKAN_SPEK',
  CATAT_SERAH_TERIMA: 'CATAT_SERAH_TERIMA',
  KOREKSI_SERAH_TERIMA: 'KOREKSI_SERAH_TERIMA',
  CATAT_SETORAN: 'CATAT_SETORAN',
  KONFIRMASI: 'KONFIRMASI',
  LIHAT_SELISIH_SEMUA: 'LIHAT_SELISIH_SEMUA',
  LIHAT_UPAH_SEMUA: 'LIHAT_UPAH_SEMUA',
  FINALISASI_UPAH: 'FINALISASI_UPAH',
  CATAT_KERJA_ULANG: 'CATAT_KERJA_ULANG',
  PUTUSKAN_KERJA_ULANG: 'PUTUSKAN_KERJA_ULANG',
  ATUR_TARIF: 'ATUR_TARIF',
  LIHAT_MILIK_SENDIRI: 'LIHAT_MILIK_SENDIRI',
});

const TABEL = Object.freeze({
  [AKSI.LIHAT_SEMUA_ORDER]: ['OWNER', 'ADMIN'],
  [AKSI.BUAT_ORDER]: ['ADMIN'],
  [AKSI.TERBITKAN_SPEK]: ['ADMIN'],
  [AKSI.CATAT_SERAH_TERIMA]: ['ADMIN'],
  [AKSI.KOREKSI_SERAH_TERIMA]: ['ADMIN'],
  [AKSI.CATAT_SETORAN]: ['ADMIN'],
  // PEKERJA untuk dirinya; ADMIN hanya atas nama VENDOR (dicek di serahTerima.js).
  [AKSI.KONFIRMASI]: ['PEKERJA', 'ADMIN'],
  [AKSI.LIHAT_SELISIH_SEMUA]: ['OWNER', 'ADMIN'],
  [AKSI.LIHAT_UPAH_SEMUA]: ['OWNER'],
  [AKSI.FINALISASI_UPAH]: ['OWNER'],
  [AKSI.CATAT_KERJA_ULANG]: ['ADMIN'],
  [AKSI.PUTUSKAN_KERJA_ULANG]: ['OWNER'],
  [AKSI.ATUR_TARIF]: ['OWNER'],
  [AKSI.LIHAT_MILIK_SENDIRI]: ['PEKERJA'],
});

export function boleh(pengguna, aksi) {
  const izin = TABEL[aksi];
  if (!izin) throw new TypeError(`Aksi tidak dikenal: ${aksi}`);
  if (!pengguna || pengguna.status !== 'AKTIF') return false;
  return izin.includes(pengguna.peran);
}

export function pastikanBoleh(pengguna, aksi) {
  if (!boleh(pengguna, aksi)) throw galatTidakBoleh();
}
