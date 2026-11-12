import { describe, expect, it } from 'vitest';
import { wib, periodeUpah, rentangPeriode, HARI } from './waktu.js';
import { boleh, pastikanBoleh, AKSI } from './wewenang.js';
import { buatIndeks, statusSerahTerima, validasiSerahTerimaBaru, validasiKonfirmasi, validasiKoreksi } from './serahTerima.js';
import { validasiQc } from './qc.js';
import { hitungSelisih } from './selisih.js';
import { validasiSetoran } from './setoran.js';
import { rincianUpah, validasiFinalisasi, validasiKerjaUlang, validasiKeputusanKerjaUlang, tarifBerlaku } from './upah.js';
import { validasiOrderBaru } from './order.js';
import { kejadianLolos, progresOrder, statusDeadline, validasiPengiriman, stokSiapDibagikan, keluaranTahap } from './progres.js';
import { validasiVersiBaru, validasiPersetujuan, versiDisetujuiTerakhir, statusVersi } from './spesifikasi.js';

// ---------- bantuan: "database" kecil di memori, meniru cara mock menambah baris ----------

const kodeGalat = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.kode ?? `ERROR: ${e.message}`;
  }
  return null;
};

const PENGGUNA = [
  { id: 'u-owner', nama: 'Owner', peran: 'OWNER', status: 'AKTIF' },
  { id: 'u-admin', nama: 'Admin', peran: 'ADMIN', status: 'AKTIF' },
  { id: 'u-ani', nama: 'Ani', peran: 'PEKERJA', status: 'AKTIF' },
  { id: 'u-budi', nama: 'Budi', peran: 'PEKERJA', status: 'AKTIF' },
  { id: 'u-dedi', nama: 'Dedi', peran: 'PEKERJA', status: 'AKTIF' },
  { id: 'u-sablon', nama: 'Sablon Jaya', peran: 'VENDOR', status: 'AKTIF' },
  { id: 'u-lama', nama: 'Eko', peran: 'PEKERJA', status: 'NONAKTIF' },
];

const AWAL = wib(2026, 11, 2, 8, 0);

function buatDb() {
  const db = {
    pengguna: PENGGUNA,
    model: [{ id: 'm-seragam', nama: 'Seragam kantor' }],
    order: [
      { id: 'o31', kode: 'ORD-031', jumlah: 300, modelId: 'm-seragam', tahapan: ['POTONG', 'SABLON', 'JAHIT', 'KIRIM'], deadline: wib(2026, 11, 28) },
    ],
    serahTerima: [],
    konfirmasi: [],
    qc: [],
    tarif: [{ id: 't1', modelId: 'm-seragam', tahap: 'JAHIT', rupiahPerPcs: 4000, berlakuMulai: wib(2026, 1, 1) }],
    versi: [],
    persetujuan: [],
    kerjaUlang: [],
    keputusan: [],
    finalisasi: [],
    pengiriman: [],
    _id: 0,
  };
  const id = () => `id${++db._id}`;
  const peta = () => ({
    penggunaById: new Map(db.pengguna.map((p) => [p.id, p])),
    orderById: new Map(db.order.map((o) => [o.id, o])),
    modelById: new Map(db.model.map((m) => [m.id, m])),
  });
  const idx = () => buatIndeks({ serahTerima: db.serahTerima, konfirmasi: db.konfirmasi, qc: db.qc });
  const pengguna = (pid) => db.pengguna.find((p) => p.id === pid);
  const cari = (sid) => db.serahTerima.find((b) => b.id === sid);

  const api = {
    db,
    idx,
    pengguna,
    cari,
    keluar(data, pada = AWAL) {
      const isi = validasiSerahTerimaBaru({ data: { arah: 'KELUAR', dariId: 'u-admin', ...data }, ...peta() });
      const baris = { id: id(), ...isi, spekVersiId: null, dibuatOleh: 'u-admin', dibuatPada: pada };
      db.serahTerima.push(baris);
      return baris;
    },
    konfirmasi(sid, olehId, hasil, alasan, pada = AWAL) {
      const isi = validasiKonfirmasi({ baris: cari(sid), idx: idx(), pelaku: pengguna(olehId), penggunaById: peta().penggunaById, hasil, alasan });
      db.konfirmasi.push({ id: id(), ...isi, pada });
    },
    koreksi(sid, pcs, alasan, pada = AWAL) {
      const isi = validasiKoreksi({ baris: cari(sid), idx: idx(), pcs, alasan });
      const baris = { id: id(), ...isi, spekVersiId: null, dibuatOleh: 'u-admin', dibuatPada: pada };
      db.serahTerima.push(baris);
      return baris;
    },
    setor(data, pada = AWAL) {
      const { baris, qc } = validasiSetoran({ data, admin: pengguna('u-admin'), serahTerima: db.serahTerima, idx: idx(), ...peta() });
      const b = { id: id(), ...baris, spekVersiId: null, dibuatOleh: 'u-admin', dibuatPada: pada };
      db.serahTerima.push(b);
      if (qc) db.qc.push({ id: id(), serahTerimaId: b.id, ...qc, oleh: 'u-admin', pada });
      return b;
    },
    upah(pekerjaId, periode) {
      return rincianUpah({
        pekerjaId,
        periode,
        serahTerima: db.serahTerima,
        idx: idx(),
        orderById: peta().orderById,
        tarifVersi: db.tarif,
        kerjaUlang: db.kerjaUlang,
        keputusanKerjaUlang: db.keputusan,
      });
    },
    selisih(pekerjaId, tahap = 'JAHIT') {
      return hitungSelisih(db.serahTerima, idx()).find((r) => r.pekerjaId === pekerjaId && r.tahap === tahap);
    },
  };
  return api;
}

// ---------- waktu ----------

describe('waktu WIB dan periode upah', () => {
  it('memotong periode di tanggal 15/16 menurut WIB, bukan UTC', () => {
    expect(periodeUpah(wib(2026, 11, 15, 23, 59))).toBe('2026-11-1');
    expect(periodeUpah(wib(2026, 11, 16, 0, 0))).toBe('2026-11-2');
    expect(periodeUpah(wib(2026, 11, 30, 23, 59))).toBe('2026-11-2');
  });
  it('rentang periode 2 berakhir di awal bulan berikutnya, termasuk Desember', () => {
    expect(rentangPeriode('2026-12-2').selesai).toBe(wib(2027, 1, 1));
    expect(kodeGalat(() => rentangPeriode('2026-13-1'))).toBe('VALIDASI');
    expect(kodeGalat(() => rentangPeriode('kemarin'))).toBe('VALIDASI');
  });
});

// ---------- wewenang ----------

describe('wewenang', () => {
  it('pekerja tidak boleh mencatat serah terima, admin boleh', () => {
    expect(boleh(PENGGUNA[2], AKSI.CATAT_SERAH_TERIMA)).toBe(false);
    expect(boleh(PENGGUNA[1], AKSI.CATAT_SERAH_TERIMA)).toBe(true);
  });
  it('akun nonaktif kehilangan semua wewenang; vendor tidak punya wewenang apa pun', () => {
    expect(boleh(PENGGUNA[6], AKSI.LIHAT_MILIK_SENDIRI)).toBe(false);
    expect(Object.values(AKSI).some((a) => boleh(PENGGUNA[5], a))).toBe(false);
  });
  it('hanya owner yang memfinalkan upah', () => {
    expect(kodeGalat(() => pastikanBoleh(PENGGUNA[1], AKSI.FINALISASI_UPAH))).toBe('TIDAK_BOLEH');
    expect(kodeGalat(() => pastikanBoleh(PENGGUNA[0], AKSI.FINALISASI_UPAH))).toBe(null);
  });
  it('aksi yang tidak dikenal adalah bug', () => {
    expect(() => boleh(PENGGUNA[0], 'HAPUS_SEMUA')).toThrow(TypeError);
  });
});

// ---------- serah terima ----------

describe('serah terima baru', () => {
  it('menolak arah yang salah, orang yang sama, pengguna nonaktif, dan tahap di luar order', () => {
    const t = buatDb();
    expect(kodeGalat(() => t.keluar({ orderId: 'o31', tahap: 'JAHIT', dariId: 'u-ani', keId: 'u-budi', pcs: 10 }))).toBe('VALIDASI');
    expect(kodeGalat(() => t.keluar({ orderId: 'o31', tahap: 'JAHIT', keId: 'u-admin', pcs: 10 }))).toBe('VALIDASI');
    expect(kodeGalat(() => t.keluar({ orderId: 'o31', tahap: 'JAHIT', keId: 'u-lama', pcs: 10 }))).toBe('VALIDASI');
    expect(kodeGalat(() => t.keluar({ orderId: 'o31', tahap: 'FINISHING', keId: 'u-ani', pcs: 10 }))).toBe('VALIDASI');
    expect(kodeGalat(() => t.keluar({ orderId: 'o31', tahap: 'KIRIM', keId: 'u-ani', pcs: 10 }))).toBe('VALIDASI');
    expect(kodeGalat(() => t.keluar({ orderId: 'o99', tahap: 'JAHIT', keId: 'u-ani', pcs: 10 }))).toBe('TIDAK_DITEMUKAN');
  });
  it('menolak pcs nol, pecahan, dan angka salah ketik yang sangat besar', () => {
    const t = buatDb();
    for (const pcs of [0, -5, 2.5, '10', 1_000_000]) {
      expect(kodeGalat(() => t.keluar({ orderId: 'o31', tahap: 'JAHIT', keId: 'u-ani', pcs }))).toBe('VALIDASI');
    }
  });
});

describe('skenario F: salah catat lalu dikoreksi', () => {
  it('ditolak penerima → koreksi baris baru → diterima; baris lama tetap ada', () => {
    const t = buatDb();
    const salah = t.keluar({ orderId: 'o31', tahap: 'JAHIT', keId: 'u-ani', pcs: 210 });
    expect(statusSerahTerima(salah, t.idx())).toBe('MENUNGGU');

    expect(kodeGalat(() => t.konfirmasi(salah.id, 'u-budi', 'DITERIMA'))).toBe('TIDAK_BOLEH');
    expect(kodeGalat(() => t.konfirmasi(salah.id, 'u-admin', 'DITERIMA'))).toBe('TIDAK_BOLEH');
    expect(kodeGalat(() => t.konfirmasi(salah.id, 'u-ani', 'DITOLAK', '   '))).toBe('VALIDASI');
    t.konfirmasi(salah.id, 'u-ani', 'DITOLAK', 'Yang saya terima 120 pcs');
    expect(statusSerahTerima(salah, t.idx())).toBe('DITOLAK');
    expect(kodeGalat(() => t.konfirmasi(salah.id, 'u-ani', 'DITERIMA'))).toBe('KONFLIK');

    expect(kodeGalat(() => t.koreksi(salah.id, 210, 'sama'))).toBe('VALIDASI');
    const benar = t.koreksi(salah.id, 120, 'Salah ketik');
    expect(statusSerahTerima(salah, t.idx())).toBe('DIKOREKSI');
    expect(statusSerahTerima(benar, t.idx())).toBe('MENUNGGU');
    expect(kodeGalat(() => t.koreksi(salah.id, 100, 'lagi'))).toBe('KONFLIK');

    t.konfirmasi(benar.id, 'u-ani', 'DITERIMA');
    expect(statusSerahTerima(benar, t.idx())).toBe('SAH');
    expect(t.selisih('u-ani')).toMatchObject({ diterima: 120, disetor: 0, selisih: 120 });
    expect(t.db.serahTerima).toHaveLength(2); // tidak ada yang ditimpa
  });

  it('baris yang belum dikonfirmasi tidak dihitung sebagai diterima', () => {
    const t = buatDb();
    t.keluar({ orderId: 'o31', tahap: 'JAHIT', keId: 'u-ani', pcs: 50 });
    expect(t.selisih('u-ani')).toBeUndefined();
  });

  it('indeks menolak data rusak: dua konfirmasi untuk satu baris', () => {
    const t = buatDb();
    const b = t.keluar({ orderId: 'o31', tahap: 'JAHIT', keId: 'u-ani', pcs: 10 });
    t.db.konfirmasi.push({ id: 'k1', serahTerimaId: b.id, hasil: 'DITERIMA' }, { id: 'k2', serahTerimaId: b.id, hasil: 'DITOLAK' });
    expect(() => t.idx()).toThrow(/Invarian/);
  });
});

describe('vendor tanpa akun', () => {
  it('serah terima ke vendor dikonfirmasi admin dan ditandai atas nama vendor', () => {
    const t = buatDb();
    const b = t.keluar({ orderId: 'o31', tahap: 'SABLON', keId: 'u-sablon', pcs: 300 });
    expect(kodeGalat(() => t.konfirmasi(b.id, 'u-ani', 'DITERIMA'))).toBe('TIDAK_BOLEH');
    t.konfirmasi(b.id, 'u-admin', 'DITERIMA');
    expect(t.db.konfirmasi[0].atasNamaVendor).toBe(true);
    // setoran tahap non-QC memakai pcs, bukan lolos/reject
    expect(kodeGalat(() => t.setor({ orderId: 'o31', tahap: 'SABLON', dariId: 'u-sablon', lolos: 300 }))).toBe('VALIDASI');
    t.setor({ orderId: 'o31', tahap: 'SABLON', dariId: 'u-sablon', pcs: 300 });
    expect(t.selisih('u-sablon', 'SABLON')).toMatchObject({ selisih: 0 });
  });
});

// ---------- QC ----------

describe('QC', () => {
  it('penyebab reject wajib dan harus dikenal', () => {
    expect(kodeGalat(() => validasiQc({ lolos: 10, reject: [{ pcs: 2 }] }))).toBe('VALIDASI');
    expect(kodeGalat(() => validasiQc({ lolos: 10, reject: [{ penyebab: 'CUACA', pcs: 2 }] }))).toBe('VALIDASI');
    expect(kodeGalat(() => validasiQc({ lolos: 0, reject: [] }))).toBe('VALIDASI');
  });
  it('menggabungkan penyebab yang sama dan menghitung total', () => {
    expect(validasiQc({ lolos: 5, reject: [{ penyebab: 'JAHIT', pcs: 1 }, { penyebab: 'BAHAN', pcs: 2 }, { penyebab: 'JAHIT', pcs: 3 }] })).toEqual({
      lolos: 5,
      reject: [
        { penyebab: 'BAHAN', pcs: 2 },
        { penyebab: 'JAHIT', pcs: 4 },
      ],
      total: 11,
    });
  });
});

// ---------- skenario B: selisih ----------

describe('skenario B: pcs hilang di penjahit', () => {
  it('diterima 100, disetor 95 (92 lolos + 3 reject) → selisih 5; setor susulan → 0', () => {
    const t = buatDb();
    const b = t.keluar({ orderId: 'o31', tahap: 'JAHIT', keId: 'u-budi', pcs: 100 });
    t.konfirmasi(b.id, 'u-budi', 'DITERIMA');

    t.setor({ orderId: 'o31', tahap: 'JAHIT', dariId: 'u-budi', lolos: 50 });
    expect(t.selisih('u-budi')).toMatchObject({ selisih: 50, status: 'DIKERJAKAN' }); // masih dijahit, bukan hilang

    t.setor({ orderId: 'o31', tahap: 'JAHIT', dariId: 'u-budi', lolos: 42, reject: [{ penyebab: 'JAHIT', pcs: 3 }], terakhir: true });
    expect(t.selisih('u-budi')).toMatchObject({ diterima: 100, disetor: 95, selisih: 5, status: 'PERLU_DICEK' });

    expect(kodeGalat(() => t.setor({ orderId: 'o31', tahap: 'JAHIT', dariId: 'u-budi', lolos: 6 }))).toBe('KONFLIK');
    t.setor({ orderId: 'o31', tahap: 'JAHIT', dariId: 'u-budi', lolos: 5 });
    expect(t.selisih('u-budi')).toMatchObject({ disetor: 100, selisih: 0, status: 'BERES' });
  });

  it('tidak bisa menyetor pcs yang belum dikonfirmasi diterima', () => {
    const t = buatDb();
    t.keluar({ orderId: 'o31', tahap: 'JAHIT', keId: 'u-budi', pcs: 100 });
    expect(kodeGalat(() => t.setor({ orderId: 'o31', tahap: 'JAHIT', dariId: 'u-budi', lolos: 1 }))).toBe('KONFLIK');
  });

  it('setoran tahap QC wajib lolos/reject, bukan pcs', () => {
    const t = buatDb();
    expect(kodeGalat(() => t.setor({ orderId: 'o31', tahap: 'JAHIT', dariId: 'u-budi', pcs: 10 }))).toBe('VALIDASI');
  });
});

// ---------- skenario C + upah ----------

function siapkanAniBudi(t) {
  const a = t.keluar({ orderId: 'o31', tahap: 'JAHIT', keId: 'u-ani', pcs: 200 });
  t.konfirmasi(a.id, 'u-ani', 'DITERIMA');
  const b = t.keluar({ orderId: 'o31', tahap: 'JAHIT', keId: 'u-budi', pcs: 100 });
  t.konfirmasi(b.id, 'u-budi', 'DITERIMA');
  const pada = wib(2026, 11, 10, 15, 0);
  t.setor({ orderId: 'o31', tahap: 'JAHIT', dariId: 'u-ani', lolos: 190, reject: [{ penyebab: 'POTONG', pcs: 10 }] }, pada);
  t.setor({ orderId: 'o31', tahap: 'JAHIT', dariId: 'u-budi', lolos: 92, reject: [{ penyebab: 'JAHIT', pcs: 3 }] }, pada);
}

describe('skenario C: reject bukan salah penjahit, dan hitung upah', () => {
  it('reject karena POTONG tetap dibayar: (190 + 10) × 4.000 = 800.000', () => {
    const t = buatDb();
    siapkanAniBudi(t);
    const u = t.upah('u-ani', '2026-11-1');
    expect(u).toMatchObject({ pcsDibayar: 200, rupiah: 800_000, tarifKosong: [] });
    expect(u.baris[0]).toMatchObject({ lolos: 190, rejectDibayar: 10, rejectTidakDibayar: 0 });
  });

  it('reject karena JAHIT tidak dibayar: 92 × 4.000 = 368.000', () => {
    const t = buatDb();
    siapkanAniBudi(t);
    expect(t.upah('u-budi', '2026-11-1')).toMatchObject({ pcsDibayar: 92, rupiah: 368_000 });
  });

  it('setoran di periode lain tidak ikut', () => {
    const t = buatDb();
    siapkanAniBudi(t);
    expect(t.upah('u-ani', '2026-11-2')).toMatchObject({ pcsDibayar: 0, rupiah: 0, baris: [] });
  });

  it('kenaikan tarif tidak mengubah upah setoran sebelum tanggal berlakunya', () => {
    const t = buatDb();
    siapkanAniBudi(t);
    t.db.tarif.push({ id: 't2', modelId: 'm-seragam', tahap: 'JAHIT', rupiahPerPcs: 5000, berlakuMulai: wib(2026, 11, 12) });
    expect(t.upah('u-ani', '2026-11-1').rupiah).toBe(800_000);
    expect(tarifBerlaku(t.db.tarif, { modelId: 'm-seragam', tahap: 'JAHIT', pada: wib(2026, 11, 13) }).rupiahPerPcs).toBe(5000);
  });

  it('tarif yang belum diatur tampil sebagai tarifKosong, bukan diam-diam 0', () => {
    const t = buatDb();
    t.db.tarif = [];
    siapkanAniBudi(t);
    const u = t.upah('u-ani', '2026-11-1');
    expect(u.rupiah).toBe(0);
    expect(u.tarifKosong).toHaveLength(1);
  });
});

describe('finalisasi upah', () => {
  const final = (t, pekerjaId, sekarang) =>
    validasiFinalisasi({
      periode: '2026-11-1',
      pekerja: t.pengguna(pekerjaId),
      rincian: t.upah(pekerjaId, '2026-11-1'),
      finalisasiUpah: t.db.finalisasi,
      serahTerima: t.db.serahTerima,
      idx: t.idx(),
      sekarang,
    });

  it('menolak sebelum periode selesai, lalu berhasil sekali saja', () => {
    const t = buatDb();
    siapkanAniBudi(t);
    expect(kodeGalat(() => final(t, 'u-ani', wib(2026, 11, 15, 20)))).toBe('KONFLIK');
    const hasil = final(t, 'u-ani', wib(2026, 11, 16, 9));
    expect(hasil).toEqual({ periode: '2026-11-1', pekerjaId: 'u-ani', pcsDibayar: 200, rupiah: 800_000 });
    t.db.finalisasi.push({ id: 'f1', ...hasil });
    expect(kodeGalat(() => final(t, 'u-ani', wib(2026, 11, 16, 9)))).toBe('KONFLIK');
  });

  it('menolak bila masih ada serah terima ke pekerja itu yang belum dikonfirmasi', () => {
    const t = buatDb();
    siapkanAniBudi(t);
    t.keluar({ orderId: 'o31', tahap: 'JAHIT', keId: 'u-ani', pcs: 20 }, wib(2026, 11, 14));
    expect(kodeGalat(() => final(t, 'u-ani', wib(2026, 11, 16, 9)))).toBe('KONFLIK');
  });

  it('menolak bila ada tarif kosong', () => {
    const t = buatDb();
    t.db.tarif = [];
    siapkanAniBudi(t);
    expect(kodeGalat(() => final(t, 'u-ani', wib(2026, 11, 16, 9)))).toBe('KONFLIK');
  });
});

// ---------- skenario D: spesifikasi + kerja ulang ----------

const ISI_V1 = { model: 'Kemeja PDH lengan pendek', warna: 'Navy', logo: 'Bordir dada kiri, putih', ukuran: { S: 50, M: 100, L: 100, XL: 50 } };

describe('skenario D: pembeli mengubah spesifikasi', () => {
  it('v1 disetujui → v2 hanya logo berubah → produksi tetap ikut v1 sampai v2 disetujui', () => {
    const t = buatDb();
    const order = t.db.order[0];
    const v1 = { id: 'v1', ...validasiVersiBaru({ order, isi: ISI_V1, versiSpek: t.db.versi }) };
    t.db.versi.push(v1);
    expect(v1.nomor).toBe(1);
    t.db.persetujuan.push({ id: 'p1', ...validasiPersetujuan({ versi: v1, versiSpek: t.db.versi, persetujuanSpek: t.db.persetujuan, hasil: 'DISETUJUI' }) });

    expect(kodeGalat(() => validasiVersiBaru({ order, isi: ISI_V1, versiSpek: t.db.versi }))).toBe('VALIDASI');
    const v2 = { id: 'v2', ...validasiVersiBaru({ order, isi: { ...ISI_V1, logo: 'Bordir dada kiri, emas' }, versiSpek: t.db.versi }) };
    t.db.versi.push(v2);
    expect(v2).toMatchObject({ nomor: 2, perubahan: ['logo'] });

    expect(versiDisetujuiTerakhir('o31', t.db.versi, t.db.persetujuan).id).toBe('v1');
    expect(statusVersi(v2, t.db.versi, t.db.persetujuan)).toBe('MENUNGGU');
    expect(kodeGalat(() => validasiPersetujuan({ versi: v1, versiSpek: t.db.versi, persetujuanSpek: t.db.persetujuan, hasil: 'DISETUJUI' }))).toBe('KONFLIK');
    expect(kodeGalat(() => validasiPersetujuan({ versi: v2, versiSpek: t.db.versi, persetujuanSpek: t.db.persetujuan, hasil: 'MINTA_UBAH' }))).toBe('VALIDASI');

    t.db.persetujuan.push({ id: 'p2', ...validasiPersetujuan({ versi: v2, versiSpek: t.db.versi, persetujuanSpek: t.db.persetujuan, hasil: 'DISETUJUI' }) });
    expect(versiDisetujuiTerakhir('o31', t.db.versi, t.db.persetujuan).id).toBe('v2');
  });

  it('total ukuran harus sama dengan jumlah order', () => {
    const order = buatDb().db.order[0];
    expect(kodeGalat(() => validasiVersiBaru({ order, isi: { ...ISI_V1, ukuran: { M: 299 } }, versiSpek: [] }))).toBe('VALIDASI');
    expect(kodeGalat(() => validasiVersiBaru({ order, isi: { ...ISI_V1, harga: 1 }, versiSpek: [] }))).toBe('VALIDASI');
  });

  it('kerja ulang yang diputuskan BAYAR masuk upah di periode keputusan; keputusan hanya sekali', () => {
    const t = buatDb();
    t.db.versi.push({ id: 'v2', orderId: 'o31', nomor: 1, isi: ISI_V1, perubahan: [] });
    const peta = { orderById: new Map(t.db.order.map((o) => [o.id, o])), penggunaById: new Map(PENGGUNA.map((p) => [p.id, p])) };
    const ku = { id: 'ku1', ...validasiKerjaUlang({ data: { orderId: 'o31', pekerjaId: 'u-ani', tahap: 'JAHIT', pcs: 30, spekVersiId: 'v2', alasan: 'Ganti warna logo' }, versiSpek: t.db.versi, ...peta }), pada: wib(2026, 11, 18) };
    t.db.kerjaUlang.push(ku);
    t.db.keputusan.push({ id: 'kk1', ...validasiKeputusanKerjaUlang({ kerjaUlang: ku, keputusanKerjaUlang: t.db.keputusan, bayar: true, tagihKePembeli: true }), pada: wib(2026, 11, 19) });
    expect(kodeGalat(() => validasiKeputusanKerjaUlang({ kerjaUlang: ku, keputusanKerjaUlang: t.db.keputusan, bayar: false, tagihKePembeli: false }))).toBe('KONFLIK');
    expect(t.upah('u-ani', '2026-11-2')).toMatchObject({ pcsDibayar: 30, rupiah: 120_000 });
    expect(kodeGalat(() => validasiKerjaUlang({ data: { orderId: 'o31', pekerjaId: 'u-ani', tahap: 'JAHIT', pcs: 1, spekVersiId: 'v-lain', alasan: 'x' }, versiSpek: t.db.versi, ...peta }))).toBe('VALIDASI');
  });
});

// ---------- skenario E: deadline ----------

describe('skenario E: deadline terancam', () => {
  const order = { id: 'o29', jumlah: 500, tahapan: ['POTONG', 'JAHIT', 'KIRIM'], deadline: wib(2026, 11, 16, 17) };
  const sekarang = wib(2026, 11, 11, 17);

  it('500 kaos, lolos 200 dalam 7 hari, deadline 5 hari lagi → TERANCAM', () => {
    const kejadian = [0, 1, 2, 3, 4, 5, 6].map((h) => ({ pada: sekarang - (6 - h) * HARI, lolos: h < 4 ? 30 : 26 + (h === 6 ? 2 : 0) }));
    expect(kejadian.reduce((a, k) => a + k.lolos, 0)).toBe(200);
    const s = statusDeadline({ order, kejadian, sekarang });
    expect(s.status).toBe('TERANCAM');
    expect(s.sisa).toBe(300);
  });

  it('laju cukup → AMAN, dengan perkiraan selesai sebelum deadline', () => {
    const kejadian = [{ pada: sekarang - 2 * HARI, lolos: 300 }];
    const s = statusDeadline({ order, kejadian, sekarang });
    expect(s.status).toBe('AMAN');
    expect(s.perkiraanSelesai).toBeLessThanOrEqual(order.deadline);
  });

  it('belum ada QC → BELUM_ADA_DATA; lewat deadline → TERLAMBAT; semua lolos → SELESAI_PRODUKSI', () => {
    expect(statusDeadline({ order, kejadian: [], sekarang }).status).toBe('BELUM_ADA_DATA');
    expect(statusDeadline({ order, kejadian: [{ pada: sekarang, lolos: 1 }], sekarang: wib(2026, 11, 17) }).status).toBe('TERLAMBAT');
    expect(statusDeadline({ order, kejadian: [{ pada: sekarang, lolos: 500 }], sekarang }).status).toBe('SELESAI_PRODUKSI');
  });
});

// ---------- progres & pengiriman ----------

describe('progres dan pengiriman', () => {
  it('progres dihitung dari lolos QC tahap terakhir; kirim tidak boleh melebihi lolos', () => {
    const t = buatDb();
    siapkanAniBudi(t);
    const order = t.db.order[0];
    const progres = progresOrder(order, kejadianLolos(order, t.db.serahTerima, t.idx()), t.db.pengiriman);
    expect(progres).toEqual({ lolos: 282, dikirim: 0, jumlah: 300, persen: 94 });
    expect(kodeGalat(() => validasiPengiriman({ order, pcs: 283, progres }))).toBe('KONFLIK');
    expect(validasiPengiriman({ order, pcs: 282, progres })).toEqual({ orderId: 'o31', pcs: 282 });
  });
});

describe('stok siap dibagikan per tahap', () => {
  it('tahap pertama dari jumlah order; tahap berikutnya dari keluaran tahap sebelumnya; DITOLAK tidak dihitung', () => {
    const t = buatDb();
    const order = t.db.order[0]; // POTONG → SABLON → JAHIT → KIRIM, 300 pcs
    expect(stokSiapDibagikan(order, 'POTONG', t.db.serahTerima, t.idx())).toEqual({ masuk: 300, keluar: 0, siap: 300 });

    const p = t.keluar({ orderId: 'o31', tahap: 'POTONG', keId: 'u-dedi', pcs: 300 });
    t.konfirmasi(p.id, 'u-dedi', 'DITERIMA');
    t.setor({ orderId: 'o31', tahap: 'POTONG', dariId: 'u-dedi', pcs: 300 });
    const s = t.keluar({ orderId: 'o31', tahap: 'SABLON', keId: 'u-sablon', pcs: 300 });
    t.konfirmasi(s.id, 'u-admin', 'DITERIMA');
    t.setor({ orderId: 'o31', tahap: 'SABLON', dariId: 'u-sablon', pcs: 300 });

    const salah = t.keluar({ orderId: 'o31', tahap: 'JAHIT', keId: 'u-ani', pcs: 210 });
    t.konfirmasi(salah.id, 'u-ani', 'DITOLAK', 'cuma 200');
    t.keluar({ orderId: 'o31', tahap: 'JAHIT', keId: 'u-budi', pcs: 100 }); // menunggu: sudah dianggap keluar
    expect(stokSiapDibagikan(order, 'JAHIT', t.db.serahTerima, t.idx())).toEqual({ masuk: 300, keluar: 100, siap: 200 });
    expect(keluaranTahap(order, 'SABLON', t.db.serahTerima, t.idx())).toBe(300);
    expect(() => stokSiapDibagikan(order, 'KIRIM', t.db.serahTerima, t.idx())).toThrow(/Invarian/);
  });
});

// ---------- order ----------

describe('order baru', () => {
  const dasar = { kode: 'ORD-040', pembeli: 'PT Contoh', modelId: 'm-seragam', jumlah: 100, hargaPerPcs: 85_000, deadline: wib(2026, 12, 20), tahapan: ['KIRIM', 'JAHIT', 'POTONG', 'JAHIT'] };
  const t = buatDb();
  const ctx = { modelById: new Map(t.db.model.map((m) => [m.id, m])), orderList: t.db.order, sekarang: wib(2026, 11, 12) };

  it('tahapan diurutkan baku tanpa duplikat', () => {
    expect(validasiOrderBaru({ data: dasar, ...ctx }).tahapan).toEqual(['POTONG', 'JAHIT', 'KIRIM']);
  });
  it('menolak tanpa JAHIT, kode ganda, deadline lampau, harga pecahan', () => {
    expect(kodeGalat(() => validasiOrderBaru({ data: { ...dasar, tahapan: ['POTONG', 'KIRIM'] }, ...ctx }))).toBe('VALIDASI');
    expect(kodeGalat(() => validasiOrderBaru({ data: { ...dasar, kode: 'ORD-031' }, ...ctx }))).toBe('KONFLIK');
    expect(kodeGalat(() => validasiOrderBaru({ data: { ...dasar, deadline: wib(2026, 11, 1) }, ...ctx }))).toBe('VALIDASI');
    expect(kodeGalat(() => validasiOrderBaru({ data: { ...dasar, hargaPerPcs: 85_000.5 }, ...ctx }))).toBe('VALIDASI');
  });
});
