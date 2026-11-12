// Domain setoran: baris SETOR + QC dalam satu langkah atomik.

import { AKSI } from '../../logika/wewenang.js';
import { validasiSetoran } from '../../logika/setoran.js';
import { sisaDiTangan } from '../../logika/selisih.js';

export const rute = [
  {
    metode: 'POST',
    pola: '/setoran',
    judul: 'Catat setoran + QC',
    handler: (ctx, { body }) => {
      ctx.izin(AKSI.CATAT_SETORAN);
      const idx = ctx.idx();
      const { baris, qc } = validasiSetoran({
        data: body,
        admin: ctx.pelaku,
        penggunaById: ctx.penggunaById,
        orderById: ctx.orderById,
        serahTerima: ctx.st.serahTerima,
        idx,
      });
      const sisa = sisaDiTangan({ pekerjaId: baris.dariId, orderId: baris.orderId, tahap: baris.tahap }, ctx.st.serahTerima, idx);
      if (qc) {
        const reject = qc.reject.map((r) => `${r.pcs} ${r.penyebab.toLowerCase()}`).join(', ') || 'tidak ada';
        ctx.catat(`QC: lolos ${qc.lolos} + reject (${reject}) = ${baris.pcs} pcs disetor`);
      }
      ctx.catat(`${ctx.nama(baris.dariId)} masih memegang ${sisa} pcs → setoran ${baris.pcs} pcs diizinkan`);
      const b = { id: ctx.baruId('s'), ...baris, spekVersiId: null, dibuatOleh: ctx.pelaku.id, dibuatPada: ctx.sekarang };
      ctx.st.serahTerima.push(b);
      if (qc) ctx.st.qc.push({ id: ctx.baruId('q'), serahTerimaId: b.id, ...qc, oleh: ctx.pelaku.id, pada: ctx.sekarang });
      const sisaBaru = sisa - baris.pcs;
      if (baris.terakhir) {
        ctx.catat(sisaBaru === 0 ? 'Setoran terakhir: selisih 0, beres' : `Setoran terakhir tapi masih selisih ${sisaBaru} pcs → tampil di dashboard owner`);
      }
      return { id: b.id, sisaDiTangan: sisaBaru };
    },
  },
];
