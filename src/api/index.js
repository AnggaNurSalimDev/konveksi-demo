// Membuat klien sesuai env. Mock hanya dimuat (import dinamis) saat mode mock.
//   VITE_API_MODE=mock (default) → backend simulasi di browser (localStorage)
//   VITE_API_MODE=real           → VITE_API_URL

import { buatKlien } from './klien.js';

export const KUNCI_SIMPAN = 'konveksi-demo-v1';

export async function siapkanKlien(sesi) {
  const mode = import.meta.env.VITE_API_MODE ?? 'mock';
  if (mode === 'real') return buatKlien({ mode, apiUrl: import.meta.env.VITE_API_URL, sesi });
  const [{ buatMockApi }, { penyimpananLokal }, { buatDataDemo }] = await Promise.all([
    import('./mock/server.js'),
    import('./mock/penyimpanan.js'),
    import('./mock/dataContoh.js'),
  ]);
  const mock = buatMockApi({ penyimpanan: penyimpananLokal(KUNCI_SIMPAN), buatDataAwal: buatDataDemo });
  return buatKlien({ mode, mock, sesi });
}
