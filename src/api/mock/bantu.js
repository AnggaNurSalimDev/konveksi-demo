// Bantuan bersama untuk handler mock: konteks request dan ringkasan order.

import { GalatLogika, KODE, galatTidakDitemukan } from '../../logika/galat.js';
import { pastikanBoleh } from '../../logika/wewenang.js';
import { buatIndeks } from '../../logika/serahTerima.js';
import { kejadianLolos, progresOrder, statusDeadline } from '../../logika/progres.js';
import { statusVersi, versiDisetujuiTerakhir, versiOrder } from '../../logika/spesifikasi.js';
import { TAHAP_QC } from '../../logika/konstanta.js';

const LABEL_PERAN = { OWNER: 'Owner', ADMIN: 'Admin', PEKERJA: 'Pekerja' };

/** Konteks satu request. `st` adalah salinan state: handler boleh menambah baris ke dalamnya. */
export function buatKonteks(st, penggunaId, langkah) {
  const penggunaById = new Map(st.pengguna.map((p) => [p.id, p]));
  const pelaku = penggunaId ? penggunaById.get(penggunaId) ?? null : null;
  return {
    st,
    sekarang: st.jamDemo,
    pelaku,
    penggunaById,
    get orderById() {
      return new Map(st.order.map((o) => [o.id, o]));
    },
    get modelById() {
      return new Map(st.model.map((m) => [m.id, m]));
    },
    idx: () => buatIndeks({ serahTerima: st.serahTerima, konfirmasi: st.konfirmasi, qc: st.qc }),
    catat(teks) {
      langkah.push({ teks, ok: true });
    },
    izin(aksi) {
      if (!pelaku) throw new GalatLogika(KODE.TIDAK_MASUK, 'Pilih pengguna dulu');
      pastikanBoleh(pelaku, aksi);
      langkah.push({ teks: `Wewenang: ${LABEL_PERAN[pelaku.peran] ?? pelaku.peran} boleh ${aksi.toLowerCase().replaceAll('_', ' ')}`, ok: true });
    },
    baruId(awalan) {
      const n = st.idBerikut;
      st.idBerikut += 1;
      return `${awalan}${n}`;
    },
    nama: (id) => penggunaById.get(id)?.nama ?? '?',
  };
}

export function cariOrder(ctx, id) {
  const o = ctx.st.order.find((x) => x.id === id);
  if (!o) throw galatTidakDitemukan('Order');
  return o;
}

/** Jumlah yang sudah selesai di tiap tahap order: non-QC = pcs disetor, QC = lolos, KIRIM = dikirim. */
function perTahap(st, order, idx, progres) {
  return order.tahapan.map((tahap) => {
    if (tahap === 'KIRIM') return { tahap, selesai: progres.dikirim };
    let selesai = 0;
    for (const b of st.serahTerima) {
      if (b.orderId !== order.id || b.arah !== 'SETOR' || b.tahap !== tahap || idx.dikoreksiOleh.has(b.id)) continue;
      selesai += TAHAP_QC.includes(tahap) ? idx.qcPer.get(b.id).lolos : b.pcs;
    }
    return { tahap, selesai };
  });
}

export function ringkasanOrder(st, order, idx, sekarang) {
  const kejadian = kejadianLolos(order, st.serahTerima, idx);
  const progres = progresOrder(order, kejadian, st.pengiriman);
  const deadline = statusDeadline({ order, kejadian, sekarang });
  const tahap = perTahap(st, order, idx, progres).map((t) => ({ ...t, jumlah: order.jumlah }));
  const tahapSekarang = tahap.find((t) => t.selesai < order.jumlah)?.tahap ?? 'SELESAI';
  const versi = versiOrder(st.versiSpek, order.id);
  const terbaru = versi.at(-1);
  const disetujui = versiDisetujuiTerakhir(order.id, st.versiSpek, st.persetujuanSpek);
  const model = st.model.find((m) => m.id === order.modelId);
  return {
    id: order.id,
    kode: order.kode,
    pembeli: order.pembeli,
    model: model?.nama ?? '?',
    jumlah: order.jumlah,
    deadline: order.deadline,
    tahapan: order.tahapan,
    progres,
    statusDeadline: deadline.status,
    perkiraanSelesai: deadline.perkiraanSelesai,
    tahap,
    tahapSekarang,
    spek: {
      nomorTerbaru: terbaru?.nomor ?? null,
      statusTerbaru: terbaru ? statusVersi(terbaru, st.versiSpek, st.persetujuanSpek) : null,
      nomorDisetujui: disetujui?.nomor ?? null,
    },
  };
}

export function tokenAcak() {
  const b = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(b);
  else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256); // hanya demo
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
