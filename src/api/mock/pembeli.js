// Domain pembeli: link bertoken, tanpa akun. Tidak pernah menampilkan nama pekerja, upah, selisih, atau biaya.

import { galatTidakDitemukan } from '../../logika/galat.js';
import { statusVersi, validasiPersetujuan, versiOrder } from '../../logika/spesifikasi.js';
import { ringkasanOrder } from './bantu.js';

function cariLink(ctx, token) {
  const l = typeof token === 'string' ? ctx.st.linkPembeli.find((x) => x.token === token && !x.dicabutPada) : null;
  if (!l) throw galatTidakDitemukan('Link');
  return l;
}

export const rute = [
  {
    metode: 'GET',
    pola: '/p/:token',
    handler: (ctx, { params }) => {
      const link = cariLink(ctx, params.token);
      const order = ctx.st.order.find((o) => o.id === link.orderId);
      const r = ringkasanOrder(ctx.st, order, ctx.idx(), ctx.sekarang);
      return {
        kode: r.kode,
        pembeli: r.pembeli,
        model: r.model,
        jumlah: r.jumlah,
        deadline: r.deadline,
        tahap: r.tahap,
        tahapSekarang: r.tahapSekarang,
        progres: r.progres,
        perkiraanSelesai: r.perkiraanSelesai,
        versi: versiOrder(ctx.st.versiSpek, order.id)
          .map((v) => ({
            id: v.id,
            nomor: v.nomor,
            isi: v.isi,
            perubahan: v.perubahan,
            pada: v.pada,
            status: statusVersi(v, ctx.st.versiSpek, ctx.st.persetujuanSpek),
            jawaban: ctx.st.persetujuanSpek.find((p) => p.spekVersiId === v.id) ?? null,
          }))
          .reverse(),
      };
    },
  },
  {
    metode: 'POST',
    pola: '/p/:token/spesifikasi/:versiId',
    judul: 'Pembeli menjawab spesifikasi',
    handler: (ctx, { params, body }) => {
      const link = cariLink(ctx, params.token);
      ctx.catat('Token link valid dan belum dicabut');
      const versi = ctx.st.versiSpek.find((v) => v.id === params.versiId && v.orderId === link.orderId) ?? null;
      const isi = validasiPersetujuan({ versi, versiSpek: ctx.st.versiSpek, persetujuanSpek: ctx.st.persetujuanSpek, hasil: body?.hasil, catatan: body?.catatan });
      ctx.catat(`Versi ${versi.nomor} adalah versi terbaru dan belum pernah dijawab`);
      ctx.st.persetujuanSpek.push({ id: ctx.baruId('a'), ...isi, pada: ctx.sekarang });
      ctx.catat(isi.hasil === 'DISETUJUI' ? `Produksi kini mengikuti versi ${versi.nomor}` : 'Admin perlu menerbitkan versi baru');
      return { status: isi.hasil };
    },
  },
];
