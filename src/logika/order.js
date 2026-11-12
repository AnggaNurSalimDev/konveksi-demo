// Order baru.
//   order { id, kode, pembeli, modelId, jumlah, hargaPerPcs, deadline, tahapan: [TAHAP...], dibuatOleh, dibuatPada }

import { MAKS_RUPIAH, TAHAP } from './konstanta.js';
import { galatKonflik, galatTidakDitemukan, galatValidasi } from './galat.js';
import { pastikanPcs, pastikanTeks } from './angka.js';
import { HARI, pastikanWaktu } from './waktu.js';

const POLA_KODE = /^ORD-\d{3,6}$/;

export function validasiOrderBaru({ data, modelById, orderList, sekarang }) {
  if (!data || typeof data !== 'object') throw galatValidasi('Data order kosong');
  const kode = pastikanTeks(data.kode, 'Kode order', { maks: 20 });
  if (!POLA_KODE.test(kode)) throw galatValidasi('Kode order harus berformat ORD-123');
  if (orderList.some((o) => o.kode === kode)) throw galatKonflik(`Kode ${kode} sudah dipakai`);
  const pembeli = pastikanTeks(data.pembeli, 'Nama pembeli', { maks: 120 });
  if (!modelById.has(data.modelId)) throw galatTidakDitemukan('Model produk');
  const jumlah = pastikanPcs(data.jumlah, 'Jumlah order');
  const harga = data.hargaPerPcs;
  if (!Number.isInteger(harga) || harga < 1 || harga > MAKS_RUPIAH) throw galatValidasi('Harga per pcs harus rupiah bulat lebih dari 0');
  const deadline = pastikanWaktu(data.deadline, 'Deadline');
  if (deadline <= sekarang) throw galatValidasi('Deadline harus di masa depan');
  if (deadline > sekarang + 365 * HARI) throw galatValidasi('Deadline lebih dari setahun lagi; periksa tanggalnya');

  if (!Array.isArray(data.tahapan)) throw galatValidasi('Tahapan wajib dipilih');
  const dipilih = new Set(data.tahapan);
  for (const t of dipilih) if (!TAHAP.includes(t)) throw galatValidasi(`Tahap tidak dikenal: ${t}`);
  for (const wajib of ['POTONG', 'JAHIT', 'KIRIM']) {
    if (!dipilih.has(wajib)) throw galatValidasi(`Tahap ${wajib} wajib ada di setiap order`);
  }
  const tahapan = TAHAP.filter((t) => dipilih.has(t)); // urutan baku, tanpa duplikat

  return { kode, pembeli, modelId: data.modelId, jumlah, hargaPerPcs: harga, deadline, tahapan };
}
