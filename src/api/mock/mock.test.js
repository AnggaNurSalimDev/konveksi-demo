import { beforeAll, describe, expect, it } from 'vitest';
import { buatMockApi } from './server.js';
import { penyimpananMemori } from './penyimpanan.js';
import { buatDataDemo } from './dataContoh.js';
import { buatKlien } from '../klien.js';
import { wib } from '../../logika/waktu.js';

let DATA;
beforeAll(() => {
  DATA = buatDataDemo();
});

function siapkan() {
  const penyimpanan = penyimpananMemori();
  const api = buatMockApi({ penyimpanan, buatDataAwal: () => structuredClone(DATA) });
  const sebagai = (penggunaId) => buatKlien({ mode: 'mock', mock: api, sesi: () => ({ penggunaId }) });
  return { api, penyimpanan, owner: sebagai('u-owner'), admin: sebagai('u-admin'), ani: sebagai('u-ani'), budi: sebagai('u-budi'), dedi: sebagai('u-dedi'), anonim: sebagai(null) };
}

const gagal = async (janji) => {
  try {
    await janji;
  } catch (e) {
    return { status: e.status, kode: e.kode, pesan: e.pesan };
  }
  return null;
};

const POST = (body) => ({ method: 'POST', body });

describe('data contoh', () => {
  it('dibangun lewat API dan memuat skenario B, D, E', async () => {
    const { owner } = siapkan();
    const order = await owner.panggil('/order');
    expect(order.map((o) => [o.kode, o.statusDeadline])).toEqual([
      ['ORD-029', 'TERANCAM'],
      ['ORD-030', 'AMAN'],
      ['ORD-031', 'AMAN'],
      ['ORD-033', 'BELUM_ADA_DATA'],
    ]);
    expect(order.find((o) => o.kode === 'ORD-030').spek).toEqual({ nomorTerbaru: 2, statusTerbaru: 'MENUNGGU', nomorDisetujui: 1 });
    const selisih = (await owner.panggil('/selisih')).filter((r) => r.status === 'PERLU_DICEK');
    expect(selisih).toMatchObject([{ pekerja: 'Budi', kode: 'ORD-031', selisih: 5 }]);
  });
});

describe('wewenang ditegakkan di mock, bukan di tampilan', () => {
  it('pekerja tidak bisa mencatat serah terima, melihat order, atau memfinalkan upah', async () => {
    const { ani } = siapkan();
    expect(await gagal(ani.panggil('/serah-terima', POST({ orderId: 'o1', tahap: 'JAHIT', keId: 'u-budi', pcs: 1 }))))
      .toMatchObject({ status: 403, kode: 'TIDAK_BOLEH' });
    expect(await gagal(ani.panggil('/order'))).toMatchObject({ status: 403 });
    expect(await gagal(ani.panggil('/upah/2026-11-1/finalisasi', POST({ pekerjaId: 'u-ani' })))).toMatchObject({ status: 403 });
  });

  it('tanpa pengguna → 401; rute tak dikenal → 404', async () => {
    const { anonim } = siapkan();
    expect(await gagal(anonim.panggil('/order'))).toMatchObject({ status: 401, kode: 'TIDAK_MASUK' });
    expect(await gagal(anonim.panggil('/hapus-semua'))).toMatchObject({ status: 404 });
  });

  it('pekerja hanya melihat selisih dan upahnya sendiri', async () => {
    const { ani } = siapkan();
    const selisih = await ani.panggil('/selisih');
    expect(new Set(selisih.map((r) => r.pekerja))).toEqual(new Set(['Ani']));
    const upah = await ani.panggil('/upah?periode=2026-11-1');
    expect(upah.daftar.map((u) => u.pekerja)).toEqual(['Ani']);
    const saya = await ani.panggil('/saya');
    expect(JSON.stringify(saya)).not.toContain('Budi');
  });
});

describe('atomik dan log', () => {
  it('request yang ditolak tidak mengubah data, tetapi tercatat di log', async () => {
    const { api, budi } = siapkan();
    const sebelum = api.keadaan().serahTerima.length;
    const s = (await budi.panggil('/saya')).pekerjaan.find((r) => r.kode === 'ORD-031');
    expect(s.selisih).toBe(5);
    expect(await gagal(budi.panggil('/setoran', POST({ orderId: s.orderId, tahap: 'JAHIT', dariId: 'u-budi', lolos: 5 })))).toMatchObject({ status: 403 });
    expect(api.keadaan().serahTerima.length).toBe(sebelum);
    expect(api.keadaan().log[0]).toMatchObject({ ok: false, pelaku: 'Budi' });
  });

  it('GET tidak masuk log; data tersimpan ke penyimpanan setelah POST', async () => {
    const { api, owner, admin, penyimpanan } = siapkan();
    await owner.panggil('/order');
    expect(api.keadaan().log).toHaveLength(0);
    const o = (await admin.panggil('/order')).find((x) => x.kode === 'ORD-031');
    await admin.panggil('/setoran', POST({ orderId: o.id, tahap: 'JAHIT', dariId: 'u-budi', lolos: 5 }));
    expect(JSON.parse(penyimpanan.baca()).log[0]).toMatchObject({ ok: true, judul: 'Catat setoran + QC' });
  });
});

describe('alur lewat API', () => {
  it('skenario B: setoran susulan 5 → selisih Budi beres', async () => {
    const { admin, owner } = siapkan();
    const o = (await admin.panggil('/order')).find((x) => x.kode === 'ORD-031');
    const r = await admin.panggil('/setoran', POST({ orderId: o.id, tahap: 'JAHIT', dariId: 'u-budi', lolos: 5 }));
    expect(r.sisaDiTangan).toBe(0);
    expect((await owner.panggil('/selisih')).filter((x) => x.status === 'PERLU_DICEK')).toEqual([]);
  });

  it('skenario F: salah ketik → ditolak → koreksi → diterima', async () => {
    const { admin, ani } = siapkan();
    const o = (await admin.panggil('/order')).find((x) => x.kode === 'ORD-029');
    const salah = await admin.panggil('/serah-terima', POST({ orderId: o.id, tahap: 'JAHIT', keId: 'u-ani', pcs: 210 }));
    expect(await gagal(ani.panggil(`/serah-terima/${salah.id}/konfirmasi`, POST({ hasil: 'DITOLAK' })))).toMatchObject({ kode: 'VALIDASI' });
    await ani.panggil(`/serah-terima/${salah.id}/konfirmasi`, POST({ hasil: 'DITOLAK', alasan: 'Saya terima 100' }));
    const benar = await admin.panggil(`/serah-terima/${salah.id}/koreksi`, POST({ pcs: 100, alasan: 'Salah ketik' }));
    await ani.panggil(`/serah-terima/${benar.id}/konfirmasi`, POST({ hasil: 'DITERIMA' }));
    const jejak = (await admin.panggil(`/order/${o.id}`)).jejak.filter((j) => j.id === salah.id || j.id === benar.id);
    expect(jejak.map((j) => [j.pcs, j.status])).toEqual([
      [100, 'SAH'],
      [210, 'DIKOREKSI'],
    ]);
  });

  it('skenario D: pembeli menyetujui v2 lewat link; link tidak membocorkan nama pekerja atau upah', async () => {
    const { admin, api, anonim } = siapkan();
    const kunci = api.jalankan('/demo/keadaan').data.linkPembeli.find((l) => l.kode === 'ORD-030').token;
    const lihat = await anonim.panggil(`/p/${kunci}`);
    const teks = JSON.stringify(lihat);
    for (const rahasia of ['Ani', 'Budi', 'Dedi', 'rupiah', 'harga', 'selisih']) expect(teks).not.toContain(rahasia);
    expect(lihat.versi[0]).toMatchObject({ nomor: 2, status: 'MENUNGGU', perubahan: ['logo'] });
    await anonim.panggil(`/p/${kunci}/spesifikasi/${lihat.versi[0].id}`, POST({ hasil: 'DISETUJUI' }));
    expect(await gagal(anonim.panggil(`/p/${kunci}/spesifikasi/${lihat.versi[0].id}`, POST({ hasil: 'DISETUJUI' })))).toMatchObject({ kode: 'KONFLIK' });
    expect(await gagal(anonim.panggil('/p/token-palsu'))).toMatchObject({ status: 404 });
    const o = (await admin.panggil('/order')).find((x) => x.kode === 'ORD-030');
    expect(o.spek.nomorDisetujui).toBe(2);
  });

  it('skenario C: finalisasi upah Ani setelah periode berakhir, sekali saja', async () => {
    const { api, owner, ani } = siapkan();
    expect(await gagal(owner.panggil('/upah/2026-11-1/finalisasi', POST({ pekerjaId: 'u-ani' })))).toMatchObject({ kode: 'KONFLIK' });
    api.jalankan('/demo/jam', { method: 'POST', body: { jam: wib(2026, 11, 16, 9) } });
    const f = await owner.panggil('/upah/2026-11-1/finalisasi', POST({ pekerjaId: 'u-ani' }));
    expect(f).toMatchObject({ pcsDibayar: 305, rupiah: 1_062_500 });
    expect(await gagal(owner.panggil('/upah/2026-11-1/finalisasi', POST({ pekerjaId: 'u-ani' })))).toMatchObject({ kode: 'KONFLIK' });
    expect((await ani.panggil('/saya')).final[0].rupiah).toBe(1_062_500);
  });

  it('jam demo hanya maju; atur ulang mengembalikan data contoh', async () => {
    const { api } = siapkan();
    expect(() => api.jalankan('/demo/jam', { method: 'POST', body: { jam: wib(2026, 11, 1) } })).toThrow(/maju/);
    api.jalankan('/demo/jam', { method: 'POST', body: { jam: wib(2026, 11, 20) } });
    api.jalankan('/demo/reset', { method: 'POST' });
    expect(api.keadaan().jamDemo).toBe(DATA.jamDemo);
  });
});
