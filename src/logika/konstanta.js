// Daftar nilai baku. Satu-satunya tempat nama tahap, peran, dan penyebab didefinisikan.

export const TAHAP = Object.freeze(['POTONG', 'SABLON', 'JAHIT', 'FINISHING', 'KIRIM']);

/** Tahap yang setorannya wajib diikuti QC (rancangan 4.3). */
export const TAHAP_QC = Object.freeze(['JAHIT', 'FINISHING']);

export const PENYEBAB = Object.freeze(['BAHAN', 'POTONG', 'JAHIT', 'FINISHING']);

/** VENDOR = pihak luar tanpa akun (mis. sablon); tidak bisa masuk, konfirmasinya oleh admin. */
export const PERAN = Object.freeze(['OWNER', 'ADMIN', 'PEKERJA', 'VENDOR']);

export const STATUS_PENGGUNA = Object.freeze(['AKTIF', 'NONAKTIF']);

/** KELUAR: admin → pekerja/vendor. SETOR: pekerja/vendor → admin. */
export const ARAH = Object.freeze(['KELUAR', 'SETOR']);

export const HASIL_KONFIRMASI = Object.freeze(['DITERIMA', 'DITOLAK']);

export const STATUS_SERAH_TERIMA = Object.freeze({
  MENUNGGU: 'MENUNGGU',
  SAH: 'SAH',
  DITOLAK: 'DITOLAK',
  DIKOREKSI: 'DIKOREKSI',
});

export const HASIL_PERSETUJUAN = Object.freeze(['DISETUJUI', 'MINTA_UBAH']);

export const FIELD_SPEK = Object.freeze(['model', 'bahan', 'warna', 'logo', 'ukuran', 'catatan', 'fotoSampel']);

/** Batas wajar untuk menangkap salah ketik (mis. 12000 alih-alih 120). */
export const MAKS_PCS = 100_000;
export const MAKS_RUPIAH = 1_000_000_000;
export const MAKS_TEKS = 300;
