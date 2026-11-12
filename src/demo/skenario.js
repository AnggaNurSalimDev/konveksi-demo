// Skenario terpandu A–F (rancangan bagian 9). Setiap skenario dimulai dari data contoh (atur ulang).
// Langkah boleh memindahkan peran: { owner: true } | { admin: true } | { pekerja: 'u-ani' } | { pembeli: 'ORD-030' }
// dan memajukan jam: { jam: ms }.

import { wib } from '../logika/waktu.js';

export const SKENARIO = [
  {
    kode: 'A',
    judul: 'Order baru sampai disetujui pembeli',
    langkah: [
      { ke: { admin: true }, teks: 'Admin membuka tab “+ Order baru”. Isi order ORD-040: pilih model, jumlah 100, harga, deadline, dan ukuran yang totalnya 100 (contoh S:20, M:40, L:40). Tekan “Buat order”.' },
      { teks: 'Order langsung terbuka. Di kartu “Link pembeli”, tekan “Buka sebagai pembeli”. Link ini yang dikirim ke pembeli lewat WA.' },
      { teks: 'Sebagai pembeli: tinjau lembar spesifikasi versi 1, lalu tekan “Setujui versi 1”. Di panel server terlihat produksi kini mengikuti versi 1.' },
      { ke: { admin: true }, teks: 'Kembali ke admin: buka ORD-040, klik panah Potong, lalu “+ Serahkan ke…” Dedi. Barisnya menunggu sampai Dedi mengonfirmasi dari HP-nya.' },
    ],
  },
  {
    kode: 'B',
    judul: 'Pcs hilang di penjahit',
    langkah: [
      { ke: { owner: true }, teks: 'Dashboard owner: “Selisih perlu dicek” menunjukkan Budi, ORD-031, 5 pcs. Budi menerima 100, setoran terakhirnya 95 (92 lolos + 3 reject).' },
      { ke: { pekerja: 'u-budi' }, teks: 'Di HP Budi terlihat angka yang sama: ORD-031 “Perlu dicek”, di tangan Budi 5 pcs. Tidak ada yang bisa membantah angka ini.' },
      { ke: { admin: true }, teks: 'Ternyata 5 pcs tertinggal di rumah Budi. Admin membuka ORD-031 → panah Jahit (bertanda “selisih”) → baris Budi → “Terima setoran”, isi lolos 5, simpan.' },
      { ke: { owner: true }, teks: 'Selisih Budi hilang dari dashboard. Coba juga menyetor 6 pcs: sistem menolak karena melebihi yang tercatat di tangan Budi.' },
    ],
  },
  {
    kode: 'C',
    judul: 'Reject bukan salah penjahit, lalu upah difinalkan',
    langkah: [
      { ke: { pekerja: 'u-ani' }, teks: 'HP Ani: di “Reject saya” ada 10 pcs ORD-031 penyebab potong. Karena bukan dari jahitan Ani, upahnya tetap dibayar.' },
      { ke: { owner: true }, teks: 'Owner → tab Upah, periode 1–15 Nov: Ani Rp 1.062.500. Tekan “Finalkan upah”: ditolak karena periodenya belum berakhir.' },
      { ke: { owner: true }, jam: wib(2026, 11, 16, 9, 0), teks: 'Jam dimajukan ke 16 Nov 09:00. Di tab Upah pilih periode 1–15 Nov, lalu finalkan upah Ani.' },
      { ke: { pekerja: 'u-ani' }, teks: 'HP Ani: upah 1–15 Nov tampil sebagai final dan tidak bisa berubah lagi.' },
    ],
  },
  {
    kode: 'D',
    judul: 'Pembeli mengubah spesifikasi',
    langkah: [
      { ke: { pembeli: 'ORD-030' }, teks: 'Link pembeli ORD-030: versi 2 menunggu persetujuan. Logo ditandai BERUBAH (putih → emas). Tekan “Setujui versi 2”.' },
      { ke: { admin: true }, teks: 'Admin membuka ORD-030. Di kartu “Kerja ulang karena versi 2”, catat Budi, Jahit, 20 pcs, alasan “bongkar dan ganti bordir logo”.' },
      { ke: { owner: true }, teks: 'Owner → tab Kerja ulang: pilih “Bayar & tagih ke pembeli”. Keputusan hanya bisa diambil sekali.' },
      { ke: { owner: true }, teks: 'Tab Upah periode berjalan: 20 pcs kerja ulang masuk upah Budi.' },
    ],
  },
  {
    kode: 'E',
    judul: 'Deadline terancam',
    langkah: [
      { ke: { owner: true }, teks: 'ORD-029 (500 kaos) berstatus “Terancam telat”: baru 40% lolos QC dengan laju sekitar 29 pcs per hari, padahal deadline 16 Nov.' },
      { ke: { admin: true }, teks: 'Panel tahap Jahit ORD-029 menunjukkan 100 potongan masih siap dibagikan di admin. Tekan “+ Serahkan ke…”, pilih Budi, 100 pcs.' },
      { ke: { pekerja: 'u-budi' }, teks: 'HP Budi: tekan “Sesuai, 100 pcs”.' },
      { ke: { pembeli: 'ORD-029' }, teks: 'Pembeli melihat status dan perkiraan selesai sendiri, tanpa harus bertanya lewat WA.' },
    ],
  },
  {
    kode: 'F',
    judul: 'Salah catat lalu dikoreksi',
    langkah: [
      { ke: { admin: true }, teks: 'Admin membuka ORD-029 → panah Jahit → “+ Serahkan ke…” Ani, ketik 210 pcs (salah ketik, seharusnya 100).' },
      { ke: { pekerja: 'u-ani' }, teks: 'HP Ani: tekan “Tidak sesuai”, tulis “Yang saya terima 100 pcs”, kirim.' },
      { ke: { admin: true }, teks: 'Kembali ke ORD-029 → panah Jahit: di “Belum dikonfirmasi penerima”, baris 210 ditolak Ani. Tekan “Koreksi jumlah”, isi 100, alasan “salah ketik”.' },
      { ke: { pekerja: 'u-ani' }, teks: 'HP Ani: koreksi 100 pcs muncul. Tekan “Sesuai”. Di jejak ORD-029, baris 210 tetap ada dengan status “Dikoreksi”.' },
    ],
  },
];
