// Domain serah terima keluar: catat, konfirmasi, koreksi, daftar menunggu.

import { AKSI } from '../../logika/wewenang.js';
import { galatValidasi } from '../../logika/galat.js';
import { statusSerahTerima, validasiKonfirmasi, validasiKoreksi, validasiSerahTerimaBaru } from '../../logika/serahTerima.js';
import { versiDisetujuiTerakhir } from '../../logika/spesifikasi.js';

function cariBaris(ctx, id) {
  return ctx.st.serahTerima.find((b) => b.id === id) ?? null;
}

function spekBerlaku(ctx, orderId) {
  return versiDisetujuiTerakhir(orderId, ctx.st.versiSpek, ctx.st.persetujuanSpek)?.id ?? null;
}

export const rute = [
  {
    metode: 'POST',
    pola: '/serah-terima',
    judul: 'Catat serah terima',
    handler: (ctx, { body }) => {
      ctx.izin(AKSI.CATAT_SERAH_TERIMA);
      if (body?.arah !== undefined && body.arah !== 'KELUAR') throw galatValidasi('Setoran dicatat lewat /setoran');
      const isi = validasiSerahTerimaBaru({
        data: { ...body, arah: 'KELUAR', dariId: ctx.pelaku.id },
        penggunaById: ctx.penggunaById,
        orderById: ctx.orderById,
      });
      ctx.catat(`Arah keluar: admin → ${ctx.nama(isi.keId)}, ${isi.pcs} pcs, tahap ${isi.tahap}`);
      const baris = { id: ctx.baruId('s'), ...isi, spekVersiId: spekBerlaku(ctx, isi.orderId), dibuatOleh: ctx.pelaku.id, dibuatPada: ctx.sekarang };
      ctx.st.serahTerima.push(baris);
      ctx.catat('Status MENUNGGU: belum dihitung sampai penerima mengonfirmasi');
      return baris;
    },
  },
  {
    metode: 'POST',
    pola: '/serah-terima/:id/konfirmasi',
    judul: 'Konfirmasi serah terima',
    handler: (ctx, { params, body }) => {
      ctx.izin(AKSI.KONFIRMASI);
      const isi = validasiKonfirmasi({
        baris: cariBaris(ctx, params.id),
        idx: ctx.idx(),
        pelaku: ctx.pelaku,
        penggunaById: ctx.penggunaById,
        hasil: body?.hasil,
        alasan: body?.alasan,
      });
      ctx.catat(isi.atasNamaVendor ? 'Penerima vendor tanpa akun: dikonfirmasi admin, ditandai' : 'Yang mengonfirmasi adalah penerimanya sendiri');
      ctx.st.konfirmasi.push({ id: ctx.baruId('c'), ...isi, pada: ctx.sekarang });
      ctx.catat(isi.hasil === 'DITERIMA' ? 'Status SAH: mulai dihitung dalam selisih' : `Ditolak: "${isi.alasan}"`);
      return { status: isi.hasil === 'DITERIMA' ? 'SAH' : 'DITOLAK' };
    },
  },
  {
    metode: 'POST',
    pola: '/serah-terima/:id/koreksi',
    judul: 'Koreksi serah terima',
    handler: (ctx, { params, body }) => {
      ctx.izin(AKSI.KOREKSI_SERAH_TERIMA);
      const lama = cariBaris(ctx, params.id);
      const isi = validasiKoreksi({ baris: lama, idx: ctx.idx(), pcs: body?.pcs, alasan: body?.alasan });
      ctx.catat(`Baris lama (${lama.pcs} pcs) TIDAK diubah; koreksi dibuat sebagai baris baru (${isi.pcs} pcs)`);
      const baris = { id: ctx.baruId('s'), ...isi, spekVersiId: spekBerlaku(ctx, isi.orderId), dibuatOleh: ctx.pelaku.id, dibuatPada: ctx.sekarang };
      ctx.st.serahTerima.push(baris);
      ctx.catat('Koreksi MENUNGGU konfirmasi penerima');
      return baris;
    },
  },
  {
    metode: 'GET',
    pola: '/serah-terima/menunggu',
    handler: (ctx) => {
      ctx.izin(AKSI.LIHAT_SEMUA_ORDER);
      const idx = ctx.idx();
      return ctx.st.serahTerima
        .filter((b) => b.arah === 'KELUAR')
        .map((b) => ({ b, status: statusSerahTerima(b, idx) }))
        .filter(({ status }) => status === 'MENUNGGU' || status === 'DITOLAK')
        .map(({ b, status }) => ({
          id: b.id,
          orderId: b.orderId,
          kode: ctx.st.order.find((o) => o.id === b.orderId)?.kode,
          tahap: b.tahap,
          ke: ctx.nama(b.keId),
          keVendor: ctx.penggunaById.get(b.keId)?.peran === 'VENDOR',
          pcs: b.pcs,
          status,
          alasanTolak: idx.konfirmasiPer.get(b.id)?.alasan ?? null,
          dibuatPada: b.dibuatPada,
        }))
        .sort((a, b) => b.dibuatPada - a.dibuatPada);
    },
  },
];
