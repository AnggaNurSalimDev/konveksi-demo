// Satu-satunya pintu data. Halaman tidak tahu sedang memakai mock atau backend asli.
//
//   const data = await klien.panggil('/order')
//   await klien.panggil('/serah-terima', { method: 'POST', body })   → melempar ErrorApi bila gagal
//
// sesi() → { penggunaId, token } milik pengguna yang sedang aktif (boleh null).

import { ErrorApi } from './ErrorApi.js';

export function buatKlien({ mode, apiUrl, mock, sesi = () => null, fetchFn = globalThis.fetch }) {
  if (mode !== 'mock' && mode !== 'real') throw new TypeError(`VITE_API_MODE harus "mock" atau "real", dapat "${mode}"`);
  if (mode === 'mock' && typeof mock?.panggil !== 'function') throw new TypeError('Mode mock butuh mock API');
  if (mode === 'real' && (typeof apiUrl !== 'string' || !/^https?:\/\//.test(apiUrl))) {
    throw new TypeError('Mode real butuh VITE_API_URL (diawali http:// atau https://)');
  }
  const dasar = mode === 'real' ? apiUrl.replace(/\/+$/, '') : '';

  /** `sebagai` (khusus demo/mock): jalankan atas nama pengguna lain, dipakai skenario terpandu. */
  async function panggil(path, { method = 'GET', body, sebagai } = {}) {
    if (typeof path !== 'string' || !path.startsWith('/')) throw new TypeError(`path harus diawali "/", dapat "${path}"`);
    if (!['GET', 'POST'].includes(method)) throw new TypeError(`Metode tidak didukung: ${method}`);
    const s = sesi() ?? {};

    if (mode === 'mock') {
      // Salin body supaya mock tidak pernah memegang objek milik halaman (sama seperti lewat jaringan).
      const penggunaId = sebagai !== undefined ? sebagai : s.penggunaId ?? null;
      const { data } = await mock.panggil(path, { method, body: body === undefined ? undefined : structuredClone(body), penggunaId });
      return data;
    }
    if (sebagai !== undefined) throw new TypeError('Opsi "sebagai" hanya ada di mode mock');

    let res;
    try {
      res = await fetchFn(dasar + path, {
        method,
        headers: {
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
          ...(s.token && { Authorization: `Bearer ${s.token}` }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ErrorApi(0, 'JARINGAN', 'Tidak bisa terhubung ke server. Periksa koneksi internet.');
    }
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* respons bukan JSON */
    }
    if (!res.ok) {
      const e = json?.error;
      throw new ErrorApi(res.status, e?.kode ?? 'TIDAK_DIKENAL', e?.pesan ?? `Server menjawab ${res.status}`, Array.isArray(e?.detail) ? e.detail : []);
    }
    if (json === null || !('data' in json)) throw new ErrorApi(res.status, 'RESPONS_ANEH', 'Respons server tidak sesuai kontrak');
    return json.data;
  }

  return { mode, panggil };
}
