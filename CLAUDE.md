# Konveksi Demo

Sumber kebenaran: **`docs/rancangan.md`**. Baca seluruhnya sebelum menulis kode.

- Yang dibangun sekarang: **web demo** (bagian 11): React + Vite, frontend saja, backend disimulasikan di `src/api/mock/`, data di localStorage, deploy Vercel.
- Bagian 1–10 adalah rancangan sistem asli dengan backend. Aturan bisnis, wewenang, dan kontrak API-nya tetap harus ditiru persis di mock.

## Aturan kerja

- Ikuti rancangan. Jika ada yang ambigu atau bertentangan, **tanyakan dulu**, jangan menebak diam-diam.
- Jangan menambah fitur di luar rancangan (bagian 10 "Di luar ruang lingkup"). Tahap 2 baru dikerjakan setelah tahap 1 selesai.
- Halaman hanya mengambil data lewat `klien.panggil()`. Tidak ada halaman yang membaca localStorage atau memanggil mock langsung.
- Logika bisnis di `src/logika/` sebagai fungsi murni: tanpa localStorage, DOM, atau `Date.now()` langsung.
- Pemeriksaan wewenang di mock/logika, bukan di tampilan. Tampilan boleh menyembunyikan tombol, tapi mock tetap harus menolak.
- Selalu sertakan guard clause dan invariant check.
- Data catatan append-only: tidak ada fungsi ubah/hapus untuk serah terima, konfirmasi, QC, versi spesifikasi, tarif, atau finalisasi upah. Koreksi = baris baru.
- Uang dan pcs: bilangan bulat. Tidak ada `eval` untuk rumus.
- Satu file mock per domain; jangan jadikan satu file raksasa.
- Setiap rumus di bagian 4.4 punya tes, termasuk contoh skenario B dan C.
- Bahasa antarmuka dan nama di kode: Indonesia.

## Saat menjelaskan perubahan ke pemilik proyek

- Bagian sensitif (wewenang, serah terima/koreksi, QC dan penyebab reject, hitung upah, link pembeli): beri konteks singkat — aturan yang disentuh, lokasi file, titik rawan — lalu tanyakan apakah perlu penelusuran detail.
- Bagian lain: jelaskan hanya jika diminta.
- Sertakan diagram sederhana (kotak/garis) yang menunjukkan alur data atau perubahan bentuk data.
