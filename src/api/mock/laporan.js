// Domain laporan: selisih dan ringkasan dashboard owner.

import { AKSI, boleh } from '../../logika/wewenang.js';
import { hitungSelisih } from '../../logika/selisih.js';
import { HARI, periodeSebelum, periodeUpah } from '../../logika/waktu.js';
import { PENYEBAB } from '../../logika/konstanta.js';
import { rincianUpah } from '../../logika/upah.js';
import { ringkasanOrder } from './bantu.js';

export function daftarSelisih(ctx, { hanyaPekerjaId = null } = {}) {
  return hitungSelisih(ctx.st.serahTerima, ctx.idx())
    .filter((r) => hanyaPekerjaId === null || r.pekerjaId === hanyaPekerjaId)
    .map((r) => ({ ...r, pekerja: ctx.nama(r.pekerjaId), kode: ctx.st.order.find((o) => o.id === r.orderId)?.kode }));
}

export function upahPeriode(ctx, pekerjaId, periode) {
  return rincianUpah({
    pekerjaId,
    periode,
    serahTerima: ctx.st.serahTerima,
    idx: ctx.idx(),
    orderById: ctx.orderById,
    tarifVersi: ctx.st.tarif,
    kerjaUlang: ctx.st.kerjaUlang,
    keputusanKerjaUlang: ctx.st.keputusanKerjaUlang,
  });
}

export const rute = [
  {
    metode: 'GET',
    pola: '/selisih',
    handler: (ctx) => {
      if (ctx.pelaku && boleh(ctx.pelaku, AKSI.LIHAT_SELISIH_SEMUA)) return daftarSelisih(ctx);
      ctx.izin(AKSI.LIHAT_MILIK_SENDIRI);
      return daftarSelisih(ctx, { hanyaPekerjaId: ctx.pelaku.id });
    },
  },
  {
    metode: 'GET',
    pola: '/ringkasan',
    handler: (ctx) => {
      ctx.izin(AKSI.LIHAT_SELISIH_SEMUA);
      const idx = ctx.idx();
      const order = ctx.st.order.map((o) => ringkasanOrder(ctx.st, o, idx, ctx.sekarang));
      const berjalan = order.filter((o) => o.progres.dikirim < o.jumlah);
      const selisih = daftarSelisih(ctx).filter((r) => r.status === 'PERLU_DICEK');

      const sejak = ctx.sekarang - 7 * HARI;
      const reject = Object.fromEntries(PENYEBAB.map((p) => [p, 0]));
      for (const q of ctx.st.qc) {
        if (q.pada < sejak || q.pada > ctx.sekarang) continue;
        for (const r of q.reject) reject[r.penyebab] += r.pcs;
      }

      const periodeLalu = periodeSebelum(periodeUpah(ctx.sekarang));
      const pekerja = ctx.st.pengguna.filter((p) => p.peran === 'PEKERJA');
      const menungguFinal = pekerja.filter(
        (p) => !ctx.st.finalisasiUpah.some((f) => f.periode === periodeLalu && f.pekerjaId === p.id) && upahPeriode(ctx, p.id, periodeLalu).pcsDibayar > 0,
      );

      return {
        orderBerjalan: berjalan.length,
        terancam: berjalan.filter((o) => o.statusDeadline === 'TERANCAM' || o.statusDeadline === 'TERLAMBAT').length,
        selisihPerluDicek: selisih.reduce((a, r) => a + Math.abs(r.selisih), 0),
        rejectMingguIni: PENYEBAB.map((p) => ({ penyebab: p, pcs: reject[p] })),
        periodeLalu,
        upahMenungguFinal: menungguFinal.map((p) => p.nama),
        menungguKonfirmasi: ctx.st.serahTerima.filter((b) => b.arah === 'KELUAR' && !idx.konfirmasiPer.has(b.id) && !idx.dikoreksiOleh.has(b.id)).length,
      };
    },
  },
];
