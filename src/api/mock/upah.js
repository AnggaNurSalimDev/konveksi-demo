// Domain upah: rincian, finalisasi, tarif, kerja ulang.

import { AKSI, boleh } from '../../logika/wewenang.js';
import { galatTidakDitemukan } from '../../logika/galat.js';
import { tarifBerlaku, validasiFinalisasi, validasiKerjaUlang, validasiKeputusanKerjaUlang, validasiTarifBaru } from '../../logika/upah.js';
import { periodeUpah, rentangPeriode } from '../../logika/waktu.js';
import { TAHAP_QC } from '../../logika/konstanta.js';
import { upahPeriode } from './laporan.js';
import { cariOrder } from './bantu.js';

function bacaPeriode(ctx, query) {
  const p = query.get('periode') || periodeUpah(ctx.sekarang);
  rentangPeriode(p);
  return p;
}

function dengan(ctx, rincian) {
  const final = ctx.st.finalisasiUpah.find((f) => f.periode === rincian.periode && f.pekerjaId === rincian.pekerjaId) ?? null;
  return {
    ...rincian,
    pekerja: ctx.nama(rincian.pekerjaId),
    baris: rincian.baris.map((r) => ({ ...r, kode: ctx.st.order.find((o) => o.id === r.orderId)?.kode })),
    final,
  };
}

export const rute = [
  {
    metode: 'GET',
    pola: '/upah',
    handler: (ctx, { query }) => {
      const periode = bacaPeriode(ctx, query);
      if (ctx.pelaku && boleh(ctx.pelaku, AKSI.LIHAT_UPAH_SEMUA)) {
        const pekerja = ctx.st.pengguna.filter((p) => p.peran === 'PEKERJA');
        return { periode, sekarang: ctx.sekarang, daftar: pekerja.map((p) => dengan(ctx, upahPeriode(ctx, p.id, periode))) };
      }
      ctx.izin(AKSI.LIHAT_MILIK_SENDIRI);
      return { periode, sekarang: ctx.sekarang, daftar: [dengan(ctx, upahPeriode(ctx, ctx.pelaku.id, periode))] };
    },
  },
  {
    metode: 'POST',
    pola: '/upah/:periode/finalisasi',
    judul: 'Finalkan upah',
    handler: (ctx, { params, body }) => {
      ctx.izin(AKSI.FINALISASI_UPAH);
      const pekerja = ctx.penggunaById.get(body?.pekerjaId);
      if (!pekerja) throw galatTidakDitemukan('Pekerja');
      const rincian = upahPeriode(ctx, pekerja.id, params.periode);
      const isi = validasiFinalisasi({
        periode: params.periode,
        pekerja,
        rincian,
        finalisasiUpah: ctx.st.finalisasiUpah,
        serahTerima: ctx.st.serahTerima,
        idx: ctx.idx(),
        sekarang: ctx.sekarang,
      });
      ctx.catat('Periode sudah berakhir, belum pernah difinalkan, semua tarif ada');
      ctx.catat(`Tidak ada serah terima ke ${pekerja.nama} yang masih menunggu konfirmasi`);
      ctx.catat(`Final: ${isi.pcsDibayar} pcs = Rp ${isi.rupiah.toLocaleString('id-ID')} (tidak bisa diubah lagi)`);
      const baris = { id: ctx.baruId('f'), ...isi, oleh: ctx.pelaku.id, pada: ctx.sekarang };
      ctx.st.finalisasiUpah.push(baris);
      return baris;
    },
  },
  {
    metode: 'GET',
    pola: '/tarif',
    handler: (ctx) => {
      ctx.izin(AKSI.LIHAT_SEMUA_ORDER);
      const daftar = ctx.st.model.flatMap((m) =>
        TAHAP_QC.map((tahap) => {
          const t = tarifBerlaku(ctx.st.tarif, { modelId: m.id, tahap, pada: ctx.sekarang });
          const riwayat = ctx.st.tarif.filter((x) => x.modelId === m.id && x.tahap === tahap).sort((a, b) => b.berlakuMulai - a.berlakuMulai);
          return { modelId: m.id, model: m.nama, tahap, berlaku: t?.rupiahPerPcs ?? null, riwayat };
        }),
      );
      return { sekarang: ctx.sekarang, daftar };
    },
  },
  {
    metode: 'POST',
    pola: '/tarif',
    judul: 'Atur tarif',
    handler: (ctx, { body }) => {
      ctx.izin(AKSI.ATUR_TARIF);
      const isi = validasiTarifBaru({ data: body, modelById: ctx.modelById, sekarang: ctx.sekarang });
      ctx.catat('Tarif baru dicatat sebagai versi baru; tarif lama tetap dipakai untuk setoran sebelum tanggal berlaku');
      const baris = { id: ctx.baruId('t'), ...isi, oleh: ctx.pelaku.id, pada: ctx.sekarang };
      ctx.st.tarif.push(baris);
      return baris;
    },
  },
  {
    metode: 'GET',
    pola: '/kerja-ulang',
    handler: (ctx) => {
      ctx.izin(AKSI.LIHAT_SEMUA_ORDER);
      return ctx.st.kerjaUlang
        .map((k) => ({
          ...k,
          pekerja: ctx.nama(k.pekerjaId),
          kode: ctx.st.order.find((o) => o.id === k.orderId)?.kode,
          nomorVersi: ctx.st.versiSpek.find((v) => v.id === k.spekVersiId)?.nomor,
          keputusan: ctx.st.keputusanKerjaUlang.find((x) => x.kerjaUlangId === k.id) ?? null,
        }))
        .sort((a, b) => b.pada - a.pada);
    },
  },
  {
    metode: 'POST',
    pola: '/kerja-ulang',
    judul: 'Catat kerja ulang',
    handler: (ctx, { body }) => {
      ctx.izin(AKSI.CATAT_KERJA_ULANG);
      cariOrder(ctx, body?.orderId);
      const isi = validasiKerjaUlang({ data: body, orderById: ctx.orderById, penggunaById: ctx.penggunaById, versiSpek: ctx.st.versiSpek });
      ctx.catat(`${isi.pcs} pcs kerja ulang oleh ${ctx.nama(isi.pekerjaId)}; menunggu keputusan owner`);
      const baris = { id: ctx.baruId('u'), ...isi, oleh: ctx.pelaku.id, pada: ctx.sekarang };
      ctx.st.kerjaUlang.push(baris);
      return baris;
    },
  },
  {
    metode: 'POST',
    pola: '/kerja-ulang/:id/keputusan',
    judul: 'Putuskan kerja ulang',
    handler: (ctx, { params, body }) => {
      ctx.izin(AKSI.PUTUSKAN_KERJA_ULANG);
      const ku = ctx.st.kerjaUlang.find((k) => k.id === params.id) ?? null;
      const isi = validasiKeputusanKerjaUlang({ kerjaUlang: ku, keputusanKerjaUlang: ctx.st.keputusanKerjaUlang, bayar: body?.bayar, tagihKePembeli: body?.tagihKePembeli });
      ctx.catat(isi.bayar ? `Dibayar: ${ku.pcs} pcs masuk upah ${ctx.nama(ku.pekerjaId)} periode ini` : 'Tidak dibayar');
      const baris = { id: ctx.baruId('d'), ...isi, oleh: ctx.pelaku.id, pada: ctx.sekarang };
      ctx.st.keputusanKerjaUlang.push(baris);
      return baris;
    },
  },
];
