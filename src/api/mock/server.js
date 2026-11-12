// Mock API: "backend palsu" di browser yang mematuhi kontrak rancangan bagian 6.
//
//   const api = buatMockApi({ penyimpanan, buatDataAwal })
//   await api.panggil('/setoran', { method: 'POST', body, penggunaId })  → { status, data } atau melempar ErrorApi
//
// Prinsip:
//   - Setiap request atomik: state disalin, handler mengubah salinan, disimpan hanya jika berhasil.
//   - Wewenang dan aturan bisnis dicek di logika/, bukan di tampilan.
//   - Setiap request tulis (berhasil atau ditolak) masuk log "Yang terjadi di server".
//   - Rute /demo/* hanya ada di demo (jam demo, atur ulang, keadaan), bukan bagian kontrak.

import { ErrorApi, STATUS_DARI_KODE } from '../ErrorApi.js';
import { GalatLogika, galatValidasi } from '../../logika/galat.js';
import { pastikanWaktu } from '../../logika/waktu.js';
import { buatKonteks } from './bantu.js';
import { rute as ruteOrder } from './order.js';
import { rute as ruteSerahTerima } from './serahTerima.js';
import { rute as ruteSetoran } from './setoran.js';
import { rute as ruteLaporan } from './laporan.js';
import { rute as ruteUpah } from './upah.js';
import { rute as rutePekerja } from './pekerja.js';
import { rute as rutePembeli } from './pembeli.js';

export const VERSI_DATA = 1;
const MAKS_LOG = 40;

const RUTE = [...ruteOrder, ...ruteSerahTerima, ...ruteSetoran, ...ruteLaporan, ...ruteUpah, ...rutePekerja, ...rutePembeli];

function cocokPola(pola, path) {
  const a = pola.split('/');
  const b = path.split('/');
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) {
      if (!b[i]) return null;
      params[a[i].slice(1)] = decodeURIComponent(b[i]);
    } else if (a[i] !== b[i]) return null;
  }
  return params;
}

function tambahLog(st, entri) {
  st.log = [{ id: st.idBerikut, waktu: st.jamDemo, ...entri }, ...(st.log ?? [])].slice(0, MAKS_LOG);
  st.idBerikut += 1;
}

export function buatMockApi({ penyimpanan, buatDataAwal }) {
  if (!penyimpanan || typeof buatDataAwal !== 'function') throw new TypeError('buatMockApi butuh penyimpanan dan buatDataAwal');

  function muat() {
    const teks = penyimpanan.baca();
    if (teks) {
      try {
        const d = JSON.parse(teks);
        if (d?.versi === VERSI_DATA) return d;
      } catch {
        /* rusak → mulai ulang */
      }
    }
    const d = buatDataAwal();
    penyimpanan.tulis(JSON.stringify(d));
    return d;
  }

  let st = muat();
  const simpan = () => penyimpanan.tulis(JSON.stringify(st));

  function demo(path, method, body) {
    if (method === 'GET' && path === '/demo/keadaan') {
      return {
        jamDemo: st.jamDemo,
        pengguna: st.pengguna.filter((p) => p.peran !== 'VENDOR').map(({ id, nama, peran }) => ({ id, nama, peran })),
        linkPembeli: st.linkPembeli.filter((l) => !l.dicabutPada).map((l) => ({ token: l.token, kode: st.order.find((o) => o.id === l.orderId)?.kode })),
        log: st.log,
      };
    }
    if (method === 'POST' && path === '/demo/jam') {
      const jam = pastikanWaktu(body?.jam, 'Jam demo');
      if (jam <= st.jamDemo) throw galatValidasi('Jam demo hanya boleh maju');
      st = { ...st, jamDemo: jam };
      simpan();
      return { jamDemo: jam };
    }
    if (method === 'POST' && path === '/demo/reset') {
      st = buatDataAwal();
      simpan();
      return { jamDemo: st.jamDemo };
    }
    throw new ErrorApi(404, 'TIDAK_DITEMUKAN', `Rute ${method} ${path} tidak ada`);
  }

  /** Versi sinkron; dipakai juga oleh pembuat data contoh. */
  function jalankan(path, { method = 'GET', body, penggunaId = null } = {}) {
    const [p, q] = path.split('?');
    if (p.startsWith('/demo/')) {
      try {
        return { status: 200, data: structuredClone(demo(p, method, body)) };
      } catch (e) {
        if (e instanceof GalatLogika) throw new ErrorApi(STATUS_DARI_KODE[e.kode], e.kode, e.message, e.detail);
        throw e;
      }
    }

    let ketemu = null;
    for (const r of RUTE) {
      if (r.metode !== method) continue;
      const params = cocokPola(r.pola, p);
      if (params) {
        ketemu = { r, params };
        break;
      }
    }
    if (!ketemu) throw new ErrorApi(404, 'TIDAK_DITEMUKAN', `Rute ${method} ${p} tidak ada`);

    const salinan = structuredClone(st);
    const langkah = [];
    const ctx = buatKonteks(salinan, penggunaId, langkah);
    const judul = ketemu.r.judul ?? `${method} ${ketemu.r.pola}`;
    const pelaku = ctx.pelaku?.nama ?? (p.startsWith('/p/') ? 'Pembeli (link)' : 'tanpa pengguna');
    try {
      const data = ketemu.r.handler(ctx, { params: ketemu.params, body, query: new URLSearchParams(q ?? '') });
      if (method !== 'GET') {
        tambahLog(salinan, { judul, pelaku, ok: true, pesan: 'Tersimpan', langkah });
        st = salinan;
        simpan();
      }
      return { status: method === 'POST' ? 201 : 200, data: structuredClone(data ?? null) };
    } catch (e) {
      if (!(e instanceof GalatLogika)) throw e; // bug, bukan kesalahan pengguna: biarkan terlihat
      if (method !== 'GET') {
        // Data tidak berubah; hanya log penolakan yang disimpan.
        const s = structuredClone(st);
        tambahLog(s, { judul, pelaku, ok: false, pesan: e.message, langkah: [...langkah, { teks: e.message, ok: false }] });
        st = s;
        simpan();
      }
      throw new ErrorApi(STATUS_DARI_KODE[e.kode], e.kode, e.message, e.detail);
    }
  }

  return {
    jalankan,
    panggil: async (path, opsi) => jalankan(path, opsi),
    keadaan: () => structuredClone(st),
  };
}
