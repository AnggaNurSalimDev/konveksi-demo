// Sesi demo: klien API, siapa yang sedang "memegang HP", dan pemicu muat ulang data.
// sesi = { peran: 'OWNER'|'ADMIN'|'PEKERJA'|'PEMBELI', penggunaId, token }

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { siapkanKlien } from './api/index.js';

const Konteks = createContext(null);

const SESI_AWAL = { peran: 'OWNER', penggunaId: 'u-owner', token: null };

function sesiDariHash() {
  const m = /^#\/p\/([0-9a-f]{16,64})$/.exec(globalThis.location?.hash ?? '');
  return m ? { peran: 'PEMBELI', penggunaId: null, token: m[1] } : null;
}

export function PenyediaSesi({ children }) {
  const [sesi, setSesiMentah] = useState(() => sesiDariHash() ?? SESI_AWAL);
  const [klien, setKlien] = useState(null);
  const [galatMuat, setGalatMuat] = useState(null);
  const [versi, setVersi] = useState(0);
  const [panel, setPanel] = useState('server');
  const ref = useRef(sesi);
  ref.current = sesi;

  useEffect(() => {
    siapkanKlien(() => ref.current).then(setKlien, (e) => setGalatMuat(e.message));
  }, []);

  useEffect(() => {
    const ikutHash = () => {
      const s = sesiDariHash();
      if (s) setSesiMentah(s);
    };
    window.addEventListener('hashchange', ikutHash);
    return () => window.removeEventListener('hashchange', ikutHash);
  }, []);

  const setSesi = useCallback((s) => {
    ref.current = s;
    setSesiMentah(s);
    const hash = s.peran === 'PEMBELI' && s.token ? `#/p/${s.token}` : '';
    if ((globalThis.location?.hash ?? '') !== hash) history.replaceState(null, '', hash || window.location.pathname);
  }, []);

  const segarkan = useCallback(() => setVersi((v) => v + 1), []);

  const nilai = useMemo(() => ({ klien, sesi, setSesi, versi, segarkan, galatMuat, panel, setPanel }), [klien, sesi, setSesi, versi, segarkan, galatMuat, panel]);
  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>;
}

export function useSesi() {
  const k = useContext(Konteks);
  if (!k) throw new Error('useSesi harus di dalam PenyediaSesi');
  return k;
}

/** Ambil data GET; otomatis dimuat ulang saat data berubah atau pengguna berganti. */
export function useData(path) {
  const { klien, versi, sesi } = useSesi();
  const [hasil, setHasil] = useState({ data: null, galat: null, memuat: true });
  useEffect(() => {
    if (!klien || !path) return undefined;
    let batal = false;
    klien.panggil(path).then(
      (data) => !batal && setHasil({ data, galat: null, memuat: false }),
      (e) => !batal && setHasil({ data: null, galat: e.pesan ?? e.message, memuat: false }),
    );
    return () => {
      batal = true;
    };
  }, [klien, path, versi, sesi.penggunaId, sesi.token]);
  return hasil;
}

/** Jalankan aksi tulis; simpan galat/sukses untuk ditampilkan; muat ulang semua data bila berhasil. */
export function useAksi() {
  const { klien, segarkan } = useSesi();
  const [keadaan, setKeadaan] = useState({ sedang: false, galat: null, pesan: null });
  const jalankan = useCallback(
    async (path, body, pesanSukses = 'Tersimpan') => {
      if (!klien) return null;
      setKeadaan({ sedang: true, galat: null, pesan: null });
      try {
        const data = await klien.panggil(path, { method: 'POST', body });
        setKeadaan({ sedang: false, galat: null, pesan: pesanSukses });
        segarkan();
        return data;
      } catch (e) {
        setKeadaan({ sedang: false, galat: e.pesan ?? e.message, pesan: null });
        segarkan(); // log penolakan ikut tampil di panel server
        return null;
      }
    },
    [klien, segarkan],
  );
  const bersihkan = useCallback(() => setKeadaan({ sedang: false, galat: null, pesan: null }), []);
  return { ...keadaan, jalankan, bersihkan };
}
