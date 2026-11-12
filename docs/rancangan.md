# Rancangan Sistem Konveksi

Sumber kebenaran proyek `konveksi-demo`. Bagian 1–10 adalah rancangan **sistem asli** (dengan backend). Bagian 11 menjelaskan **web demo** yang dibangun sekarang: murni frontend, backend disimulasikan di browser, tetapi mematuhi kontrak yang sama.

> Status: semua masalah di bawah adalah **hipotesis** dari pola umum usaha konveksi, belum dari data lapangan. Validasi lewat klien pertama (sistem gratis, imbalan data nyata). Pertanyaan terbuka dikumpulkan di bagian 10.

---

## 1. Konteks

Konveksi memproduksi pakaian jadi dalam jumlah banyak berdasarkan pesanan (seragam, kaos komunitas, jaket, PDH, makloon untuk brand). Pembelinya kebanyakan lembaga atau usaha.

Sasaran: **konveksi menengah**, yang sudah kewalahan dengan catatan manual tetapi belum memakai ERP pabrik garmen.

Alur produksi:

```
Order + desain → spesifikasi disetujui → DP
  → POTONG → SABLON/BORDIR (sering vendor luar) → JAHIT (dalam / borongan / makloon)
  → FINISHING → QC → KIRIM → pelunasan
```

Ciri yang menentukan desain: barang berpindah tangan berkali-kali, tenaga kerja campuran (tetap, borongan per pcs, makloon), banyak order berjalan bersamaan.

## 2. Masalah dan inti solusi

| Pihak | Masalah utama |
|---|---|
| Owner | Status order buram; selisih pcs antar tahap; margin baru ketahuan belakangan; upah borongan rawan sengketa; sumber reject tidak terlacak; perubahan pesanan lewat WA tidak tercatat |
| Pegawai | Disalahkan tanpa bukti; reject dipotong dari upah tanpa alasan; kerja ulang tidak dibayar; admin input dua kali |
| Pembeli | Buta progres; telat dari tanggal acara; sengketa "saya sudah bilang di chat"; rekap ukuran per orang repot; hasil tidak sesuai sampel |

**Inti sistem: catatan serah terima barang antar tahap, dikonfirmasi dua pihak, tidak pernah ditimpa.** Status order, selisih, upah, dan sumber reject semuanya dihitung dari catatan ini.

Di luar inti (ditunda): kapasitas penjahit, penagihan piutang.

## 3. Peran dan wewenang

| Peran | Masuk lewat | Boleh |
|---|---|---|
| `OWNER` | akun | Lihat semua; atur tarif per model; putuskan kerja ulang; finalkan upah; kelola pengguna |
| `ADMIN` (admin produksi / mandor) | akun | Buat order; terbitkan versi spesifikasi; catat serah terima, koreksi, dan QC; catat biaya bahan |
| `PEKERJA` (penjahit/finishing: dalam, borongan, makloon) | akun | Lihat serah terima, QC, dan upah **miliknya sendiri**; konfirmasi atau tolak serah terima yang ditujukan kepadanya |
| Pembeli | link bertoken per order, tanpa akun | Lihat status dan perkiraan selesai; lihat dan setujui/minta ubah spesifikasi; (tahap 2) kelola formulir ukuran |

Aturan:

- Setiap pemeriksaan wewenang terjadi **di server**, bukan di tampilan.
- Pekerja tidak pernah menerima data pekerja lain (termasuk upah dan selisih orang lain).
- Akun tidak dihapus; dinonaktifkan (`status: NONAKTIF`). Catatan lamanya tetap ada.
- Akun owner pertama dibuat manual saat pemasangan. Akun admin dan pekerja dibuat owner.

## 4. Konsep inti

### 4.1 Data hanya ditambah (append-only)

Tabel catatan (`serah_terima`, `konfirmasi`, `qc`, `spesifikasi_versi`, `persetujuan_spek`, `keputusan_kerja_ulang`, `finalisasi_upah`, `tarif_versi`) **tidak punya operasi ubah atau hapus**. Koreksi = baris baru yang menunjuk baris lama. Status dihitung (diturunkan) dari baris-baris yang ada, tidak disimpan sebagai kolom yang diubah.

### 4.2 Serah terima

Satu baris = satu perpindahan barang fisik.

```
serah_terima { id, orderId, tahap, dariId, keId, pcs, spekVersiId,
               koreksiDariId?, catatan?, dibuatOleh, dibuatPada }
konfirmasi   { id, serahTerimaId, oleh, hasil: DITERIMA|DITOLAK, alasan?, pada }
```

- `tahap` ∈ `POTONG, SABLON, JAHIT, FINISHING, KIRIM`.
- Arah keluar: admin → pekerja/vendor. Arah setor: pekerja/vendor → admin.
- `spekVersiId` = versi spesifikasi yang disetujui terakhir **saat baris dibuat**.

Status sebuah serah terima (diturunkan):

```
           ┌─ konfirmasi DITERIMA ─→ SAH
MENUNGGU ──┤
           └─ konfirmasi DITOLAK ──→ DITOLAK ──(admin buat koreksi)──→ DIKOREKSI
SAH / MENUNGGU ──(ada baris lain dengan koreksiDariId = id ini)──→ DIKOREKSI
```

- Hanya baris **SAH** yang dihitung dalam selisih dan upah.
- Yang mengonfirmasi = **penerima** (`keId`). Untuk arah setor, penerimanya admin; konfirmasinya terjadi lewat pencatatan QC (4.3).
- Penerima tanpa akun (vendor sablon luar): admin mengonfirmasi sendiri dengan tanda `tanpaKonfirmasiPenerima: true`. Tanda ini terlihat di dashboard owner.
- Satu baris hanya bisa dikoreksi satu kali; koreksi atas koreksi menunjuk baris koreksi terakhir (rantai, bukan cabang).

### 4.3 QC dan penyebab reject

Setiap setoran pekerja ke admin di tahap JAHIT/FINISHING diikuti satu catatan QC.

```
qc { id, serahTerimaId (arah setor), lolos, reject: [{ penyebab, pcs }], oleh, pada }
```

- `penyebab` ∈ `BAHAN, POTONG, JAHIT, FINISHING`. **Wajib** bila ada reject.
- Invarian: `lolos + Σ reject.pcs = pcs` pada baris setor.
- Pcs **disetor** = semua pcs fisik yang dikembalikan, lolos maupun reject.

### 4.4 Rumus

Untuk pekerja P, order O, tahap T (hanya baris SAH):

```
diterima(P,O,T) = Σ pcs serah_terima keluar ke P
disetor(P,O,T)  = Σ pcs serah_terima setor dari P
selisih(P,O,T)  = diterima − disetor
```

Contoh (skenario B): diterima 100, disetor 95 (92 lolos + 3 reject) → selisih 5.

- Selisih > 0 = pcs masih di tangan pekerja atau hilang. Selisih < 0 = salah catat; tampil sebagai peringatan.
- Selisih ditampilkan, **tidak** otomatis memotong upah. Tindak lanjutnya keputusan owner.

Upah pekerja P untuk periode X:

```
pcsDibayar = Σ (lolos + reject yang penyebabnya ≠ JAHIT) dari QC setoran P di periode X
           + pcs kerja ulang yang diputuskan BAYAR
upah       = Σ pcsDibayar × tarif model order tsb yang berlaku pada tanggal setor
```

- Untuk tahap FINISHING, penyebab yang mengecualikan upah adalah `FINISHING` (bukan `JAHIT`). Aturan umum: reject tidak dibayar hanya bila penyebabnya **tahap yang dikerjakan pekerja itu sendiri**.
- Tarif per model berversi (`tarif_versi { modelId, tahap, rupiahPerPcs, berlakuMulai }`); perubahan tarif tidak mengubah upah periode lalu.
- Periode upah: default 2 mingguan (1–15, 16–akhir bulan). **Hipotesis**, perlu dicek ke klien.
- Upah periode yang sudah difinalkan owner tidak berubah lagi. Koreksi sesudahnya masuk ke periode berikutnya sebagai baris penyesuaian.

Progres order:

```
lolosQC(O) = Σ lolos QC tahap terakhir yang dipakai order O
progres    = lolosQC / jumlah order
```

Peringatan "terancam telat" (**sementara**, rumus asli menunggu data kecepatan produksi klien):

```
laju      = lolosQC 7 hari terakhir / 7
butuhHari = (jumlah − lolosQC) / laju      (laju 0 → dianggap tak terhingga)
TERANCAM jika butuhHari > hari kerja tersisa sebelum deadline
```

Margin order (tahap 2): `harga jual × jumlah − Σ biaya_bahan − Σ upah atas order itu`.

### 4.5 Spesifikasi berversi

```
spesifikasi_versi { id, orderId, nomor, isi: {model, bahan, warna, logo, ukuran, catatan, fotoSampel?},
                    perubahan: [field], diterbitkanOleh, pada }
persetujuan_spek  { id, spekVersiId, hasil: DISETUJUI|MINTA_UBAH, catatanPembeli?, pada }
```

- Versi tidak pernah diubah. Perubahan = versi baru (`nomor + 1`) dengan daftar field yang berubah.
- Produksi mengikuti **versi disetujui terakhir**. Versi baru yang belum disetujui tidak menghentikan produksi.
- Persetujuan hanya untuk versi terbaru; versi lama tidak bisa disetujui lagi.
- Pcs yang dikerjakan ulang karena perubahan spesifikasi dicatat sebagai `kerja_ulang { orderId, pekerjaId, pcs, spekVersiId, alasan }`, lalu owner memutuskan `keputusan_kerja_ulang { BAYAR|TIDAK, tagihKePembeli: bool }`.

### 4.6 Link pembeli

- Token acak ≥ 128 bit per order, disimpan sebagai hash. Bisa dicabut dan diterbitkan ulang oleh admin/owner.
- Hanya membuka data order itu: status per tahap, progres, perkiraan selesai, spesifikasi, riwayat versi.
- Tidak menampilkan nama pekerja, upah, selisih, atau biaya.
- Formulir ukuran anggota (tahap 2): link terpisah, hanya bisa menambah baris `{nama, ukuran}` sampai kuota order; pembeli bisa melihat rekapnya.

## 5. Model data (sistem asli, PostgreSQL)

| Tabel | Kolom penting | Catatan |
|---|---|---|
| `pengguna` | id, nama, peran, status, dibuatPada | |
| `model_produk` | id, nama | contoh: kaos, kemeja PDH |
| `tarif_versi` | modelId, tahap, rupiahPerPcs, berlakuMulai | append-only |
| `order` | id, kode, pembeli, modelId, jumlah, hargaPerPcs, deadline, dibuatPada | |
| `spesifikasi_versi`, `persetujuan_spek` | lihat 4.5 | append-only |
| `serah_terima`, `konfirmasi` | lihat 4.2 | append-only |
| `qc` | lihat 4.3 | append-only |
| `kerja_ulang`, `keputusan_kerja_ulang` | lihat 4.5 | append-only |
| `biaya_bahan` | orderId, keterangan, rupiah, pada | append-only (tahap 2) |
| `finalisasi_upah` | periode, pekerjaId, pcsDibayar, rupiah, oleh, pada | append-only |
| `link_pembeli` | orderId, tokenHash, dicabutPada? | |
| `ukuran_anggota` | orderId, nama, ukuran, pada | tahap 2 |
| `log_audit` | pelaku, aksi, target, hasil, pada | semua aksi tulis, termasuk yang ditolak |

Uang disimpan sebagai **bilangan bulat rupiah**. Waktu disimpan UTC, ditampilkan WIB.

## 6. Kontrak API

Format respons sama untuk backend asli dan simulasi:

```
sukses : { "data": ... }
gagal  : { "error": { "kode": "VALIDASI|TIDAK_BOLEH|TIDAK_DITEMUKAN|KONFLIK|TIDAK_MASUK", "pesan": "...", "detail": [] } }
```

| Metode | Path | Peran | Isi / aturan |
|---|---|---|---|
| POST | `/masuk` | semua akun | → `{ pengguna, token }` |
| GET | `/order` | OWNER, ADMIN | daftar order + progres + status deadline |
| POST | `/order` | ADMIN | buat order + spesifikasi versi 1 + link pembeli |
| GET | `/order/:id` | OWNER, ADMIN | detail, ringkasan per tahap, jejak serah terima |
| POST | `/order/:id/spesifikasi` | ADMIN | terbitkan versi baru; `perubahan` wajib tidak kosong |
| POST | `/serah-terima` | ADMIN | `{orderId, tahap, dariId, keId, pcs}`; pcs bulat > 0; status awal MENUNGGU |
| POST | `/serah-terima/:id/koreksi` | ADMIN | `{pcs, alasan}`; hanya untuk baris MENUNGGU/DITOLAK/SAH yang belum dikoreksi |
| POST | `/serah-terima/:id/konfirmasi` | PEKERJA penerima | `{hasil, alasan?}`; hanya baris MENUNGGU yang `keId` = dirinya; `alasan` wajib bila DITOLAK |
| POST | `/setoran` | ADMIN | setor + QC sekaligus: `{orderId, tahap, dariId, lolos, reject:[{penyebab,pcs}]}`; tolak bila setor membuat disetor > diterima |
| GET | `/selisih` | OWNER (semua), PEKERJA (miliknya) | selisih per pekerja/order/tahap |
| GET | `/upah?periode=` | OWNER (semua), PEKERJA (miliknya) | rincian per setoran |
| POST | `/upah/:periode/finalisasi` | OWNER | `{pekerjaId}`; tolak bila masih ada serah terima MENUNGGU milik pekerja itu di periode tsb |
| POST | `/kerja-ulang` | ADMIN | lihat 4.5 |
| POST | `/kerja-ulang/:id/keputusan` | OWNER | `{bayar, tagihKePembeli}`; sekali saja |
| POST | `/tarif` | OWNER | versi tarif baru |
| GET | `/saya` | PEKERJA | serah terima menunggu, rekap pcs, reject + penyebab, upah berjalan |
| GET | `/p/:token` | pembeli | status, progres, perkiraan selesai, spesifikasi, riwayat versi |
| POST | `/p/:token/spesifikasi/:versiId` | pembeli | `{hasil, catatan?}`; hanya versi terbaru yang belum dijawab |

Setiap request tulis **atomik**: semua berubah atau tidak sama sekali.

## 7. Keamanan (sistem asli)

- Password di-hash (argon2/bcrypt); token sesi dengan masa berlaku; batas percobaan masuk.
- Wewenang dicek per endpoint dan per baris (pekerja hanya baris miliknya).
- Validasi input di server (skema); angka pcs dan rupiah bilangan bulat dengan batas wajar.
- Database: pengguna aplikasi tidak punya izin `UPDATE`/`DELETE` pada tabel append-only.
- `log_audit` untuk setiap aksi tulis, termasuk yang ditolak.

## 8. Halaman

| Peran | Perangkat | Isi |
|---|---|---|
| Owner | desktop | Ringkasan (order berjalan, terancam telat, selisih, upah menunggu final), tabel order, selisih per pekerja, reject per penyebab, upah per periode, tarif per model |
| Admin | desktop | Detail order per tahap, catat serah terima, daftar menunggu konfirmasi + koreksi, setoran + QC, jejak serah terima, terbitkan spesifikasi |
| Pekerja | HP | Konfirmasi terima (Sesuai / Tidak sesuai), pekerjaan saya, reject + penyebab, upah periode berjalan |
| Pembeli | HP, tanpa login | Status per tahap, perkiraan selesai, lembar spesifikasi + tombol setujui/minta ubah, riwayat versi, (tahap 2) formulir ukuran |

Rancangan visual: kanvas desain "Sistem Konveksi — Halaman Owner, Pegawai, Pembeli" (di luar repo).

## 9. Skenario acuan

| Kode | Skenario | Fitur yang diuji |
|---|---|---|
| A | Order normal 300 seragam: order → spek v1 disetujui → potong → serah ke Ani (200) dan Budi (100) → setor → QC → kirim → upah final | semua alur utama |
| B | Budi menerima 100, menyetor 95 (92 lolos + 3 reject jahit) → selisih 5 → setor susulan 5 → selisih 0 | selisih, setor susulan |
| C | QC menemukan 10 pcs Ani dengan potongan miring → penyebab POTONG → upah Ani tetap dihitung | penyebab reject, upah |
| D | Pembeli minta ganti warna logo saat produksi → spek v2 → disetujui lewat link → kerja ulang → owner putuskan bayar | versi spek, kerja ulang |
| E | Order 500 kaos, deadline 5 hari, progres 40% → TERANCAM → owner pindahkan sebagian ke pekerja lain | peringatan, link status |
| F | Admin salah ketik 210 (seharusnya 120) → Ani menolak → koreksi 120 → Ani menerima | konfirmasi, koreksi |

## 10. Di luar ruang lingkup dan pertanyaan terbuka

Di luar ruang lingkup: kapasitas/penjadwalan penjahit, penagihan piutang, pembayaran online, akun pembeli, multi-cabang, stok bahan per meter, notifikasi WA/SMS.

Pertanyaan terbuka (dijawab oleh klien pertama):

1. Admin produksi orang terpisah, atau owner sendiri yang mencatat?
2. Apakah penjahit borongan mau dan mampu mengonfirmasi lewat HP? Bagaimana cara masuk yang paling ringan untuk mereka?
3. Periode upah yang dipakai (mingguan, 2 mingguan, per order)?
4. Rumus "terancam telat" yang masuk akal untuk kecepatan produksi mereka.
5. Bagaimana serah terima ke vendor luar dicatat di dunia nyata?
6. Apakah pembeli benar-benar membuka link status?

---

## 11. Web demo (yang dibangun sekarang)

Tujuan: **promosi**. Pengunjung harus bisa mencoba semua peran dan melihat kenapa sistem menerima atau menolak sesuatu.

### 11.1 Teknologi

- React + Vite, JavaScript. Tanpa backend; deploy Vercel.
- Tes: Vitest untuk `logika/` dan mock API.
- Validasi body: skema (zod) di `skema/`, dipakai juga oleh backend asli nanti.

### 11.2 Struktur

```
src/
  api/
    klien.js          satu pintu data: klien.panggil(path, {method, body})
    mock/             backend simulasi, dipecah per domain
      server.js       router: path + metode → handler; atomik; tulis log
      order.js
      serahTerima.js
      setoran.js
      upah.js
      spesifikasi.js
      pembeli.js
      penyimpanan.js  localStorage (gagal → memori)
      dataContoh.js
  logika/             fungsi murni: rumus 4.4, status 4.2, wewenang 3
  skema/
  halaman/owner/ admin/ pekerja/ pembeli/
  demo/               bar peran, jam demo, panel server, skenario terpandu
```

- `klien.js` punya mode `mock` (default) dan `real` (`VITE_API_MODE`, `VITE_API_URL`). Halaman tidak tahu sedang memakai yang mana.
- Mock mematuhi kontrak bagian 6 persis, termasuk kode galat dan pemeriksaan wewenang. Body disalin (`structuredClone`) sebelum masuk mock.
- `logika/` tanpa localStorage, DOM, atau `Date.now()` langsung. Waktu datang dari jam demo.

### 11.3 Fitur khusus demo

- **Bar peran:** ganti peran dan orang (Owner, Admin, Ani, Budi, Dedi, Pembeli) tanpa login. Masuk dengan password tidak disimulasikan.
- **Jam demo:** bisa dimajukan (tidak bisa mundur), untuk mencoba periode upah dan deadline.
- **Panel "Yang terjadi di server":** setiap aksi menampilkan pemeriksaan yang dijalankan (✓/✗) dan hasilnya.
- **Skenario terpandu A–F** (bagian 9): tiap skenario mulai dari data awal, langkah demi langkah, dengan pindah peran otomatis.
- **Atur ulang data** ke data contoh.
- Halaman pembeli dibuka lewat link `/p/<token>` sungguhan di dalam demo.

### 11.4 Data contoh

- Pekerja: Ani, Budi, Dedi (penjahit borongan). Admin: satu. Owner: satu.
- Order: ORD-029 kaos komunitas 500 (terancam), ORD-030 PDH 80 (menunggu spek v2), ORD-031 seragam kantor 300 (normal), ORD-033 jaket angkatan 120 (baru dipotong).
- Tarif contoh Rp 4.000/pcs jahit. Semua nama dan angka fiktif, ditandai "data contoh" di tampilan.

### 11.5 Urutan pengerjaan

1. `logika/` + tes (status serah terima, selisih, upah, progres, deadline, wewenang).
2. Mock API + tes kontrak per endpoint.
3. Halaman admin (sumber data semua halaman lain).
4. Halaman pekerja.
5. Halaman owner.
6. Halaman pembeli.
7. Fitur demo: bar peran, panel server, jam demo, skenario terpandu.
8. Deploy Vercel, README dengan tautan demo.

Tahap 2 (margin, biaya bahan, formulir ukuran) dibangun setelah tahap 1 selesai dan diuji.
