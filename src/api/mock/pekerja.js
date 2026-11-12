// Domain pekerja: GET /saya — hanya data milik pekerja yang masuk.

import { AKSI } from '../../logika/wewenang.js';
import { statusSerahTerima } from '../../logika/serahTerima.js';
import { periodeUpah } from '../../logika/waktu.js';
import { daftarSelisih, upahPeriode } from './laporan.js';

const kodeOrder = (ctx, id) => ctx.st.order.find((o) => o.id === id)?.kode;

export const rute = [
  {
    metode: 'GET',
    pola: '/saya',
    handler: (ctx) => {
      ctx.izin(AKSI.LIHAT_MILIK_SENDIRI);
      const saya = ctx.pelaku.id;
      const idx = ctx.idx();

      const perluKonfirmasi = ctx.st.serahTerima
        .filter((b) => b.arah === 'KELUAR' && b.keId === saya && statusSerahTerima(b, idx) === 'MENUNGGU')
        .map((b) => ({ id: b.id, kode: kodeOrder(ctx, b.orderId), tahap: b.tahap, pcs: b.pcs, koreksi: b.koreksiDariId !== null, catatan: b.catatan, dibuatPada: b.dibuatPada }));

      const reject = [];
      for (const b of ctx.st.serahTerima) {
        if (b.arah !== 'SETOR' || b.dariId !== saya) continue;
        const q = idx.qcPer.get(b.id);
        if (!q) continue;
        for (const r of q.reject) {
          reject.push({ kode: kodeOrder(ctx, b.orderId), tahap: b.tahap, penyebab: r.penyebab, pcs: r.pcs, dibayar: r.penyebab !== b.tahap, pada: b.dibuatPada });
        }
      }

      const periode = periodeUpah(ctx.sekarang);
      return {
        nama: ctx.pelaku.nama,
        perluKonfirmasi,
        pekerjaan: daftarSelisih(ctx, { hanyaPekerjaId: saya }),
        reject: reject.sort((a, b) => b.pada - a.pada),
        upah: { ...upahPeriode(ctx, saya, periode), periode },
        final: ctx.st.finalisasiUpah.filter((f) => f.pekerjaId === saya).sort((a, b) => b.pada - a.pada),
      };
    },
  },
];
