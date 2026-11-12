// Data contoh demo. Riwayat dibangun LEWAT mock API (bukan ditulis tangan), jadi semua aturan dan invarian
// berlaku pada data awal juga. Semua nama dan angka fiktif.

import { buatMockApi, VERSI_DATA } from './server.js';
import { penyimpananMemori } from './penyimpanan.js';
import { wib } from '../../logika/waktu.js';

const ADMIN = 'u-admin';

function keadaanDasar() {
  const t = (modelId, tahap, rupiahPerPcs) => ({ id: `t-${modelId}-${tahap}`, modelId, tahap, rupiahPerPcs, berlakuMulai: wib(2026, 1, 1), oleh: 'u-owner', pada: wib(2026, 1, 1) });
  return {
    versi: VERSI_DATA,
    jamDemo: wib(2026, 11, 1, 8, 0),
    idBerikut: 1,
    pengguna: [
      { id: 'u-owner', nama: 'Pak Hendra', peran: 'OWNER', status: 'AKTIF' },
      { id: ADMIN, nama: 'Rina', peran: 'ADMIN', status: 'AKTIF' },
      { id: 'u-ani', nama: 'Ani', peran: 'PEKERJA', status: 'AKTIF' },
      { id: 'u-budi', nama: 'Budi', peran: 'PEKERJA', status: 'AKTIF' },
      { id: 'u-dedi', nama: 'Dedi', peran: 'PEKERJA', status: 'AKTIF' },
      { id: 'u-sablon', nama: 'Sablon Jaya', peran: 'VENDOR', status: 'AKTIF' },
    ],
    model: [
      { id: 'm-kaos', nama: 'Kaos' },
      { id: 'm-seragam', nama: 'Seragam kantor' },
      { id: 'm-pdh', nama: 'Kemeja PDH' },
      { id: 'm-jaket', nama: 'Jaket' },
    ],
    tarif: [t('m-kaos', 'JAHIT', 2500), t('m-seragam', 'JAHIT', 4000), t('m-pdh', 'JAHIT', 6000), t('m-pdh', 'FINISHING', 1500), t('m-jaket', 'JAHIT', 9000)],
    order: [],
    versiSpek: [],
    persetujuanSpek: [],
    linkPembeli: [],
    serahTerima: [],
    konfirmasi: [],
    qc: [],
    pengiriman: [],
    kerjaUlang: [],
    keputusanKerjaUlang: [],
    finalisasiUpah: [],
    log: [],
  };
}

export function buatDataDemo() {
  const api = buatMockApi({ penyimpanan: penyimpananMemori(), buatDataAwal: keadaanDasar });
  const panggil = (penggunaId, path, method = 'GET', body) => api.jalankan(path, { method, body, penggunaId }).data;
  const admin = (path, body) => panggil(ADMIN, path, 'POST', body);
  const jam = (tgl, j = 9, m = 0) => {
    const target = wib(2026, 11, tgl, j, m);
    if (target > api.keadaan().jamDemo) panggil(null, '/demo/jam', 'POST', { jam: target });
  };
  const keluar = (orderId, tahap, keId, pcs) => admin('/serah-terima', { orderId, tahap, keId, pcs }).id;
  const terima = (id, olehId) => panggil(olehId, `/serah-terima/${id}/konfirmasi`, 'POST', { hasil: 'DITERIMA' });
  const setor = (body) => admin('/setoran', body);

  // --- 1 Nov: empat order dibuat, pembeli menyetujui spesifikasi v1 ---
  jam(1, 9);
  const buat = (kode, pembeli, modelId, jumlah, hargaPerPcs, deadline, tahapan, isiSpek) => {
    const r = admin('/order', { kode, pembeli, modelId, jumlah, hargaPerPcs, deadline, tahapan, isiSpek });
    const v = panggil(null, `/p/${r.token}`).versi[0];
    panggil(null, `/p/${r.token}/spesifikasi/${v.id}`, 'POST', { hasil: 'DISETUJUI' });
    return r.id;
  };
  const o29 = buat('ORD-029', 'Komunitas Lari Bandung', 'm-kaos', 500, 65_000, wib(2026, 11, 16, 17), ['POTONG', 'JAHIT', 'KIRIM'], {
    model: 'Kaos lari dry-fit lengan pendek', bahan: 'Dry-fit 140 gsm', warna: 'Hitam', logo: 'Sablon dada depan', ukuran: { S: 80, M: 180, L: 160, XL: 80 },
  });
  const o30 = buat('ORD-030', 'Koperasi Sejahtera', 'm-pdh', 80, 145_000, wib(2026, 11, 20, 17), ['POTONG', 'SABLON', 'JAHIT', 'FINISHING', 'KIRIM'], {
    model: 'Kemeja PDH lengan pendek', bahan: 'American drill', warna: 'Navy', logo: 'Bordir dada kiri, putih', ukuran: { S: 10, M: 30, L: 25, XL: 15 },
  });
  const o31 = buat('ORD-031', 'PT Sinar Abadi', 'm-seragam', 300, 120_000, wib(2026, 11, 28, 17), ['POTONG', 'SABLON', 'JAHIT', 'KIRIM'], {
    model: 'Seragam kantor lengan panjang', bahan: 'Oxford', warna: 'Biru muda', logo: 'Sablon dada kiri', ukuran: { S: 40, M: 110, L: 100, XL: 50 },
  });
  const o33 = buat('ORD-033', 'SMA Contoh Angkatan 2027', 'm-jaket', 120, 210_000, wib(2026, 12, 5, 17), ['POTONG', 'JAHIT', 'KIRIM'], {
    model: 'Jaket varsity', bahan: 'Fleece + kulit sintetis', warna: 'Merah marun', logo: 'Bordir punggung', ukuran: { M: 40, L: 50, XL: 30 },
  });

  // --- 2–3 Nov: potong (Dedi) ---
  jam(2, 8);
  for (const [o, n] of [[o29, 500], [o30, 80], [o31, 300]]) terima(keluar(o, 'POTONG', 'u-dedi', n), 'u-dedi');
  jam(3, 16);
  for (const [o, n] of [[o29, 500], [o30, 80], [o31, 300]]) setor({ orderId: o, tahap: 'POTONG', dariId: 'u-dedi', pcs: n, terakhir: true });

  // --- 3–5 Nov: sablon/bordir di vendor luar (dikonfirmasi admin atas nama vendor) ---
  jam(3, 17);
  for (const [o, n] of [[o30, 80], [o31, 300]]) terima(keluar(o, 'SABLON', 'u-sablon', n), ADMIN);
  jam(5, 10);
  for (const [o, n] of [[o30, 80], [o31, 300]]) setor({ orderId: o, tahap: 'SABLON', dariId: 'u-sablon', pcs: n, terakhir: true });

  // --- 4–5 Nov: jahit dibagikan ---
  jam(4, 8);
  terima(keluar(o29, 'JAHIT', 'u-ani', 150), 'u-ani');
  terima(keluar(o29, 'JAHIT', 'u-budi', 100), 'u-budi');
  terima(keluar(o29, 'JAHIT', 'u-dedi', 150), 'u-dedi'); // 100 potongan ORD-029 masih di admin
  jam(5, 11);
  terima(keluar(o31, 'JAHIT', 'u-ani', 200), 'u-ani');
  terima(keluar(o31, 'JAHIT', 'u-budi', 100), 'u-budi');
  terima(keluar(o30, 'JAHIT', 'u-budi', 80), 'u-budi');

  // --- 5–11 Nov, berurutan menurut waktu (jam demo hanya bisa maju) ---
  // ORD-029 disetor sedikit demi sedikit tiap pukul 14.00 (laju ±29/hari → terancam).
  const harian = [[15, 13], [15, 13], [15, 13], [15, 13], [15, 14], [15, 14], [15, 15]];
  const setor29 = (i) => {
    const [ani, dedi] = harian.at(i);
    jam(5 + i, 14);
    setor({ orderId: o29, tahap: 'JAHIT', dariId: 'u-ani', lolos: ani });
    setor({ orderId: o29, tahap: 'JAHIT', dariId: 'u-dedi', lolos: dedi, ...(i === 2 && { reject: [{ penyebab: 'BAHAN', pcs: 2 }] }) });
  };
  for (let i = 0; i <= 3; i++) setor29(i); // 5–8 Nov

  // 8 Nov sore: ORD-030 jahit selesai, finishing jalan
  jam(8, 15);
  setor({ orderId: o30, tahap: 'JAHIT', dariId: 'u-budi', lolos: 80, terakhir: true });
  terima(keluar(o30, 'FINISHING', 'u-dedi', 80), 'u-dedi');

  for (let i = 4; i <= 5; i++) setor29(i); // 9–10 Nov

  // 10 Nov sore: ORD-031 jahit selesai (skenario B dan C), finishing ORD-030 sebagian
  jam(10, 15);
  setor({ orderId: o31, tahap: 'JAHIT', dariId: 'u-ani', lolos: 190, reject: [{ penyebab: 'POTONG', pcs: 10 }], terakhir: true });
  setor({ orderId: o31, tahap: 'JAHIT', dariId: 'u-budi', lolos: 92, reject: [{ penyebab: 'JAHIT', pcs: 3 }], terakhir: true });
  setor({ orderId: o30, tahap: 'FINISHING', dariId: 'u-dedi', lolos: 72 });

  // 11 Nov pagi: pembeli ORD-030 minta logo emas → versi 2 menunggu; ORD-033 mulai dipotong
  jam(11, 10);
  const d30 = panggil(ADMIN, `/order/${o30}`);
  admin(`/order/${o30}/spesifikasi`, { isi: { ...d30.versi.at(-1).isi, logo: 'Bordir dada kiri, emas' } });
  keluar(o33, 'POTONG', 'u-dedi', 120);

  setor29(6); // 11 Nov 14.00
  jam(11, 16);

  // Invarian: riwayat harus tercatat urut waktu (jam demo tidak pernah mundur).
  const st = api.keadaan();
  st.serahTerima.forEach((b, i) => {
    if (i > 0 && b.dibuatPada < st.serahTerima.at(i - 1).dibuatPada) throw new Error(`Data contoh tidak urut waktu di ${b.id}`);
  });

  const hasil = api.keadaan();
  hasil.log = []; // log riwayat pembuatan data tidak ditampilkan
  return hasil;
}
