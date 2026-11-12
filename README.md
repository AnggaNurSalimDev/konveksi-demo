# Konveksi Demo

Sistem lacak produksi untuk **konveksi menengah**: setiap perpindahan barang antar tahap dicatat dan dikonfirmasi dua pihak, sehingga owner tahu posisi setiap order, ke mana pcs yang hilang, dan berapa upah borongan yang adil, tanpa menghitung manual.

> **Demo:** [konveksi-demo.vercel.app](https://konveksi-demo.vercel.app) · data contoh di browser, tanpa login sungguhan · pilih peran di bar atas.

## Masalah yang diselesaikan

```
Kain cacat → potong miring → jahit → QC: REJECT
   ?             ?            ✗ upah dipotong
                              (sering yang paling lemah)
```

Di konveksi, barang berpindah tangan berkali-kali. Tanpa catatan serah terima yang disepakati kedua pihak:

- **Owner** tidak tahu status order dan baru sadar telat mepet deadline.
- **Pcs bocor** antar tahap, dan tidak jelas di tangan siapa.
- **Upah borongan** dihitung manual dan sering disengketakan; penjahit disalahkan untuk cacat yang bukan dari jahitannya.
- **Pembeli** bertanya "sudah sampai mana?" lewat WA berkali-kali, dan revisi spesifikasi tenggelam di chat.

## Cara kerja

```
Admin catat serah terima ──→ penerima konfirmasi di HP ──→ SAH
          │                                              │
          └── salah? koreksi = baris BARU (lama tetap) ──┘
                                                         ▼
             selisih = diterima − disetor   ·   upah = (lolos + reject bukan salahnya) × tarif
             progres & perkiraan selesai    ·   link status untuk pembeli (tanpa login)
```

- **Tidak ada data yang ditimpa.** Status dihitung dari baris konfirmasi, QC, dan koreksi.
- **Reject wajib dicatat penyebabnya** (bahan, potong, jahit, finishing). Upah hanya dipotong bila penyebabnya tahap pekerja itu sendiri.
- **Spesifikasi berversi.** Perubahan dari pembeli menjadi versi baru yang harus disetujui lewat link; produksi mengikuti versi yang disetujui.

## Peran di demo

| Peran | Yang bisa dicoba |
|---|---|
| Owner | Ringkasan order, selisih yang perlu dicek, reject per penyebab, upah per periode + finalisasi, keputusan kerja ulang, tarif per model |
| Admin produksi | Buat order, catat serah terima, setoran + QC, koreksi, terbitkan versi spesifikasi, kirim, link pembeli |
| Pekerja (Ani, Budi, Dedi) | Konfirmasi "Sesuai / Tidak sesuai", pekerjaan saya, reject + penyebab, upah berjalan |
| Pembeli | Status per tahap, perkiraan selesai, lembar spesifikasi untuk disetujui |

Fitur khusus demo: **skenario terpandu A–F**, panel **"Yang terjadi di server"** (setiap pemeriksaan ✓/✗), **jam demo** yang bisa dimajukan, dan **atur ulang data**.

## Menjalankan

Butuh Node.js 18+.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 48 tes: logika, kontrak mock API, tampilan
npm run build
```

## Deploy ke Vercel

1. Di Vercel: **Add New → Project → Import** repo `konveksi-demo`.
2. Framework terdeteksi **Vite**; biarkan pengaturan bawaan (build `npm run build`, output `dist`).
3. Tidak perlu environment variable (mode bawaan `mock`). Tekan **Deploy**.

## Arsitektur

```
halaman/ ──klien.panggil()──→ api/klien.js ──mode mock──→ api/mock/  (backend simulasi, per domain)
                                          └─mode real──→ VITE_API_URL (backend asli nanti)
api/mock/* ──→ logika/  (fungsi murni: aturan bisnis, wewenang, rumus; diuji)
```

- `docs/rancangan.md` — sumber kebenaran: peran, aturan, rumus, model data PostgreSQL, kontrak API, keamanan.
- Halaman tidak tahu sedang memakai mock atau backend asli. Backend asli cukup mematuhi kontrak di rancangan bagian 6, lalu `VITE_API_MODE=real` dan `VITE_API_URL=https://…`.

Semua nama usaha, orang, dan angka di demo adalah fiktif.
