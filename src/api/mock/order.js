// Domain order: daftar, detail, buat order (+ spek v1 + link pembeli), versi spek, pengiriman.

import { AKSI } from '../../logika/wewenang.js';
import { validasiOrderBaru } from '../../logika/order.js';
import { validasiVersiBaru, statusVersi, versiOrder } from '../../logika/spesifikasi.js';
import { kejadianLolos, progresOrder, validasiPengiriman, stokSiapDibagikan } from '../../logika/progres.js';
import { statusSerahTerima } from '../../logika/serahTerima.js';
import { hitungSelisih } from '../../logika/selisih.js';
import { TAHAP_QC } from '../../logika/konstanta.js';
import { cariOrder, ringkasanOrder, tokenAcak } from './bantu.js';
import { daftarMenunggu } from './serahTerima.js';

/**
 * Isi panel per tahap di halaman admin: barang siap dibagikan, siapa memegang berapa, dan yang belum dikonfirmasi.
 * Pemegang = pekerja/vendor dengan serah terima SAH di tahap itu, ditambah yang baru punya serah terima menunggu.
 */
export function panelTahap(ctx, order, idx) {
  const selisih = hitungSelisih(ctx.st.serahTerima, idx).filter((r) => r.orderId === order.id);
  const menunggu = daftarMenunggu(ctx, idx, (b) => b.orderId === order.id);
  return order.tahapan
    .filter((t) => t !== 'KIRIM')
    .map((tahap) => {
      const menungguTahap = menunggu.filter((m) => m.tahap === tahap);
      const baris = new Map(
        selisih
          .filter((r) => r.tahap === tahap)
          .map((r) => [r.pekerjaId, { pekerjaId: r.pekerjaId, diterima: r.diterima, disetor: r.disetor, diTangan: r.selisih, status: r.status, adaSetoranTerakhir: r.adaSetoranTerakhir }]),
      );
      for (const m of menungguTahap) {
        if (!baris.has(m.keId)) baris.set(m.keId, { pekerjaId: m.keId, diterima: 0, disetor: 0, diTangan: 0, status: null, adaSetoranTerakhir: false });
      }
      const pemegang = [...baris.values()]
        .map((r) => {
          const p = ctx.penggunaById.get(r.pekerjaId);
          const pcsMenunggu = menungguTahap.filter((m) => m.keId === r.pekerjaId && m.status === 'MENUNGGU').reduce((a, m) => a + m.pcs, 0);
          return { ...r, nama: p?.nama ?? '?', vendor: p?.peran === 'VENDOR', pcsMenunggu };
        })
        .sort((a, b) => a.nama.localeCompare(b.nama));
      return { tahap, pakaiQc: TAHAP_QC.includes(tahap), stok: stokSiapDibagikan(order, tahap, ctx.st.serahTerima, idx), pemegang, menunggu: menungguTahap };
    });
}

export function jejakOrder(ctx, order, idx) {
  return ctx.st.serahTerima
    .filter((b) => b.orderId === order.id)
    .map((b) => {
      const k = idx.konfirmasiPer.get(b.id);
      const q = idx.qcPer.get(b.id);
      return {
        id: b.id,
        tahap: b.tahap,
        arah: b.arah,
        dari: ctx.nama(b.dariId),
        ke: ctx.nama(b.keId),
        dariId: b.dariId,
        keId: b.keId,
        pcs: b.pcs,
        status: statusSerahTerima(b, idx),
        koreksiDariId: b.koreksiDariId,
        catatan: b.catatan,
        terakhir: b.terakhir === true,
        alasanTolak: k?.hasil === 'DITOLAK' ? k.alasan : null,
        atasNamaVendor: k?.atasNamaVendor === true,
        qc: q ? { lolos: q.lolos, reject: q.reject } : null,
        dibuatPada: b.dibuatPada,
      };
    })
    .sort((a, b) => b.dibuatPada - a.dibuatPada || b.id.localeCompare(a.id));
}

export const rute = [
  {
    metode: 'GET',
    pola: '/model',
    handler: (ctx) => {
      ctx.izin(AKSI.LIHAT_SEMUA_ORDER);
      return ctx.st.model;
    },
  },
  {
    metode: 'GET',
    pola: '/pengguna',
    handler: (ctx) => {
      ctx.izin(AKSI.LIHAT_SEMUA_ORDER);
      return ctx.st.pengguna.map(({ id, nama, peran, status }) => ({ id, nama, peran, status }));
    },
  },
  {
    metode: 'GET',
    pola: '/order',
    handler: (ctx) => {
      ctx.izin(AKSI.LIHAT_SEMUA_ORDER);
      const idx = ctx.idx();
      return ctx.st.order.map((o) => ringkasanOrder(ctx.st, o, idx, ctx.sekarang)).sort((a, b) => a.deadline - b.deadline);
    },
  },
  {
    metode: 'GET',
    pola: '/order/:id',
    handler: (ctx, { params }) => {
      ctx.izin(AKSI.LIHAT_SEMUA_ORDER);
      const order = cariOrder(ctx, params.id);
      const idx = ctx.idx();
      const link = ctx.st.linkPembeli.find((l) => l.orderId === order.id && !l.dicabutPada);
      return {
        ...ringkasanOrder(ctx.st, order, idx, ctx.sekarang),
        hargaPerPcs: order.hargaPerPcs,
        jejak: jejakOrder(ctx, order, idx),
        panelTahap: panelTahap(ctx, order, idx),
        versi: versiOrder(ctx.st.versiSpek, order.id).map((v) => ({ ...v, status: statusVersi(v, ctx.st.versiSpek, ctx.st.persetujuanSpek) })),
        tokenPembeli: link?.token ?? null,
        pengiriman: ctx.st.pengiriman.filter((p) => p.orderId === order.id),
        kerjaUlang: ctx.st.kerjaUlang.filter((k) => k.orderId === order.id).map((k) => ({ ...k, pekerja: ctx.nama(k.pekerjaId) })),
      };
    },
  },
  {
    metode: 'POST',
    pola: '/order',
    judul: 'Buat order',
    handler: (ctx, { body }) => {
      ctx.izin(AKSI.BUAT_ORDER);
      const isi = validasiOrderBaru({ data: body, modelById: ctx.modelById, orderList: ctx.st.order, sekarang: ctx.sekarang });
      ctx.catat(`Data order valid: ${isi.kode}, ${isi.jumlah} pcs, tahapan ${isi.tahapan.join(' → ')}`);
      const order = { id: ctx.baruId('o'), ...isi, dibuatOleh: ctx.pelaku.id, dibuatPada: ctx.sekarang };
      const versi = validasiVersiBaru({ order, isi: body?.isiSpek, versiSpek: ctx.st.versiSpek });
      ctx.catat('Spesifikasi versi 1 valid, total ukuran = jumlah order');
      ctx.st.order.push(order);
      ctx.st.versiSpek.push({ id: ctx.baruId('v'), ...versi, diterbitkanOleh: ctx.pelaku.id, pada: ctx.sekarang });
      const token = tokenAcak();
      ctx.st.linkPembeli.push({ id: ctx.baruId('l'), orderId: order.id, token, dibuatPada: ctx.sekarang, dicabutPada: null });
      ctx.catat('Link pembeli dibuat (token acak 128 bit)');
      return { id: order.id, kode: order.kode, token };
    },
  },
  {
    metode: 'POST',
    pola: '/order/:id/spesifikasi',
    judul: 'Terbitkan versi spesifikasi',
    handler: (ctx, { params, body }) => {
      ctx.izin(AKSI.TERBITKAN_SPEK);
      const order = cariOrder(ctx, params.id);
      const versi = validasiVersiBaru({ order, isi: body?.isi, versiSpek: ctx.st.versiSpek });
      ctx.catat(`Versi ${versi.nomor}: field berubah dihitung server → ${versi.perubahan.join(', ')}`);
      ctx.catat('Versi lama tetap tersimpan; produksi tetap ikut versi disetujui sampai pembeli menyetujui versi ini');
      const baris = { id: ctx.baruId('v'), ...versi, diterbitkanOleh: ctx.pelaku.id, pada: ctx.sekarang };
      ctx.st.versiSpek.push(baris);
      return baris;
    },
  },
  {
    metode: 'POST',
    pola: '/order/:id/pengiriman',
    judul: 'Catat pengiriman',
    handler: (ctx, { params, body }) => {
      ctx.izin(AKSI.CATAT_SERAH_TERIMA);
      const order = cariOrder(ctx, params.id);
      const progres = progresOrder(order, kejadianLolos(order, ctx.st.serahTerima, ctx.idx()), ctx.st.pengiriman);
      const isi = validasiPengiriman({ order, pcs: body?.pcs, progres });
      ctx.catat(`Dikirim ${isi.pcs} ≤ lolos QC belum dikirim (${progres.lolos - progres.dikirim})`);
      const baris = { id: ctx.baruId('k'), ...isi, oleh: ctx.pelaku.id, pada: ctx.sekarang };
      ctx.st.pengiriman.push(baris);
      return baris;
    },
  },
];
