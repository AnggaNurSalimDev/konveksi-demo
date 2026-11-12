// Waktu disimpan sebagai milidetik UTC (bilangan bulat), ditampilkan dan dikelompokkan dalam WIB (UTC+7, tanpa DST).
// Tidak ada Date.now() di sini: "sekarang" selalu datang dari pemanggil (jam demo / server).

import { galatValidasi } from './galat.js';

export const MENIT = 60_000;
export const JAM = 60 * MENIT;
export const HARI = 24 * JAM;
export const OFFSET_WIB = 7 * JAM;

export function pastikanWaktu(ms, nama = 'Waktu') {
  if (!Number.isInteger(ms) || ms < 0) throw galatValidasi(`${nama} tidak valid`);
  return ms;
}

/** Tanggal kalender WIB dari ms UTC. */
export function tanggalWib(ms) {
  pastikanWaktu(ms);
  const d = new Date(ms + OFFSET_WIB);
  return { tahun: d.getUTCFullYear(), bulan: d.getUTCMonth() + 1, tanggal: d.getUTCDate() };
}

/** ms UTC untuk jam:menit WIB pada tanggal itu. */
export function wib(tahun, bulan, tanggal, jam = 0, menit = 0) {
  return Date.UTC(tahun, bulan - 1, tanggal, jam, menit) - OFFSET_WIB;
}

export function awalHariWib(ms) {
  pastikanWaktu(ms);
  return Math.floor((ms + OFFSET_WIB) / HARI) * HARI - OFFSET_WIB;
}

const dua = (n) => String(n).padStart(2, '0');

/** Periode upah 2 mingguan (rancangan 4.4, hipotesis): "YYYY-MM-1" = tgl 1–15, "YYYY-MM-2" = tgl 16–akhir. */
export function periodeUpah(ms) {
  const { tahun, bulan, tanggal } = tanggalWib(ms);
  return `${tahun}-${dua(bulan)}-${tanggal <= 15 ? 1 : 2}`;
}

const POLA_PERIODE = /^(\d{4})-(\d{2})-([12])$/;

/** { mulai, selesai } dalam ms UTC; selesai eksklusif. */
export function rentangPeriode(periode) {
  const m = typeof periode === 'string' ? POLA_PERIODE.exec(periode) : null;
  if (!m) throw galatValidasi(`Periode tidak valid: ${String(periode)}`);
  const tahun = Number(m[1]);
  const bulan = Number(m[2]);
  if (bulan < 1 || bulan > 12) throw galatValidasi(`Periode tidak valid: ${periode}`);
  if (m[3] === '1') return { mulai: wib(tahun, bulan, 1), selesai: wib(tahun, bulan, 16) };
  return { mulai: wib(tahun, bulan, 16), selesai: wib(tahun, bulan + 1, 1) };
}

export function periodeSebelum(periode) {
  const { mulai } = rentangPeriode(periode);
  return periodeUpah(mulai - 1);
}

export function dalamPeriode(ms, periode) {
  const { mulai, selesai } = rentangPeriode(periode);
  return ms >= mulai && ms < selesai;
}
