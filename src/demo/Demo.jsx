// Fitur khusus demo: bar peran, jam demo, panel "Yang terjadi di server", skenario terpandu.
// Hanya bagian ini yang memanggil rute /demo/*.

import { useState } from 'react';
import { useData, useSesi } from '../sesi.jsx';
import { jamTanggal, tanggal } from '../format.js';
import { HARI, JAM } from '../logika/waktu.js';
import { SKENARIO } from './skenario.js';

const PERAN_TETAP = [
  { label: 'Owner', sesi: { peran: 'OWNER', penggunaId: 'u-owner', token: null } },
  { label: 'Admin', sesi: { peran: 'ADMIN', penggunaId: 'u-admin', token: null } },
];

function sesiUntuk(ke, linkPembeli) {
  if (!ke) return null;
  if (ke.owner) return PERAN_TETAP[0].sesi;
  if (ke.admin) return PERAN_TETAP[1].sesi;
  if (ke.pekerja) return { peran: 'PEKERJA', penggunaId: ke.pekerja, token: null };
  if (ke.pembeli) {
    const l = linkPembeli.find((x) => x.kode === ke.pembeli);
    return l ? { peran: 'PEMBELI', penggunaId: null, token: l.token } : null;
  }
  return null;
}

export function BarDemo() {
  const { klien, sesi, setSesi, segarkan, panel, setPanel } = useSesi();
  const keadaan = useData('/demo/keadaan');
  const k = keadaan.data;
  const pekerja = k?.pengguna.filter((p) => p.peran === 'PEKERJA') ?? [];
  const majukan = async (ms) => {
    await klien.panggil('/demo/jam', { method: 'POST', body: { jam: k.jamDemo + ms } });
    segarkan();
  };
  const aturUlang = async () => {
    await klien.panggil('/demo/reset', { method: 'POST' });
    setSesi(PERAN_TETAP[0].sesi);
    segarkan();
  };
  const sama = (s) => s.peran === sesi.peran && s.penggunaId === sesi.penggunaId;

  return (
    <header className="bar-demo">
      <div className="merek">Konveksi Demo<small>data contoh · tanpa backend</small></div>
      <div className="grup" role="group" aria-label="Pilih peran">
        <span className="label">Lihat sebagai</span>
        {PERAN_TETAP.map((p) => (
          <button key={p.label} type="button" className="pil" aria-pressed={sama(p.sesi)} onClick={() => setSesi(p.sesi)}>{p.label}</button>
        ))}
        {pekerja.map((p) => {
          const s = { peran: 'PEKERJA', penggunaId: p.id, token: null };
          return <button key={p.id} type="button" className="pil" aria-pressed={sama(s)} onClick={() => setSesi(s)}>{p.nama}</button>;
        })}
        <label className="label" htmlFor="pilih-pembeli">Pembeli</label>
        <select id="pilih-pembeli" value={sesi.peran === 'PEMBELI' ? sesi.token ?? '' : ''} onChange={(e) => e.target.value && setSesi({ peran: 'PEMBELI', penggunaId: null, token: e.target.value })}>
          <option value="">pilih order…</option>
          {k?.linkPembeli.map((l) => <option key={l.token} value={l.token}>{l.kode}</option>)}
        </select>
      </div>
      <div className="grup" role="group" aria-label="Jam demo">
        <span className="jam">{k ? `${tanggal(k.jamDemo)} ${jamTanggal(k.jamDemo).split(' ').at(-1)} WIB` : '…'}</span>
        <button type="button" className="pil" disabled={!k} onClick={() => majukan(JAM)}>+1 jam</button>
        <button type="button" className="pil" disabled={!k} onClick={() => majukan(HARI)}>+1 hari</button>
      </div>
      <div className="grup">
        <button type="button" className="pil" aria-pressed={panel === 'skenario'} onClick={() => setPanel(panel === 'skenario' ? 'server' : 'skenario')}>Skenario terpandu</button>
        <button type="button" className="pil" onClick={aturUlang}>Atur ulang data</button>
      </div>
    </header>
  );
}

export function PanelServer() {
  const keadaan = useData('/demo/keadaan');
  const log = keadaan.data?.log ?? [];
  return (
    <div className="kartu tumpuk">
      <h2 style={{ margin: 0 }}>Yang terjadi di server</h2>
      <p className="label">Setiap aksi dicek di “server” (di demo ini disimulasikan di browser). Penolakan juga tercatat, dan data tidak berubah.</p>
      {log.length === 0 && <p className="redup kecil">Belum ada aksi. Coba salah satu skenario terpandu.</p>}
      {log.slice(0, 8).map((l) => (
        <div key={l.id} className={`log ${l.ok ? 'ok' : 'gagal'}`}>
          <div className="antara kecil"><strong>{l.judul}</strong><span className="redup">{l.pelaku} · {jamTanggal(l.waktu)}</span></div>
          {l.langkah.map((x, i) => (
            <div key={i} className={`kecil ${x.ok ? 'teks-ok' : 'teks-gagal'}`}>{x.ok ? '✓' : '✗'} {x.teks}</div>
          ))}
          <div className={`kecil ${l.ok ? 'teks-ok' : 'teks-gagal'}`} style={{ fontWeight: 600 }}>→ {l.ok ? 'Tersimpan' : 'Ditolak, data tidak berubah'}</div>
        </div>
      ))}
    </div>
  );
}

export function PanelSkenario() {
  const { klien, setSesi, segarkan } = useSesi();
  const [aktif, setAktif] = useState(null);
  const [langkah, setLangkah] = useState(0);
  const [sibuk, setSibuk] = useState(false);

  const terapkan = async (sk, i) => {
    const l = sk.langkah[i];
    const k = await klien.panggil('/demo/keadaan');
    if (l.jam && l.jam > k.jamDemo) await klien.panggil('/demo/jam', { method: 'POST', body: { jam: l.jam } });
    const s = sesiUntuk(l.ke, k.linkPembeli);
    if (s) setSesi(s);
    segarkan();
  };

  const mulai = async (sk) => {
    setSibuk(true);
    try {
      await klien.panggil('/demo/reset', { method: 'POST' });
      setAktif(sk);
      setLangkah(0);
      await terapkan(sk, 0);
    } finally {
      setSibuk(false);
    }
  };

  const pindah = async (i) => {
    setLangkah(i);
    await terapkan(aktif, i);
  };

  if (!aktif) {
    return (
      <div className="kartu tumpuk">
        <h2 style={{ margin: 0 }}>Skenario terpandu</h2>
        <p className="label">Setiap skenario memulai ulang data contoh, lalu memandu Anda langkah demi langkah sambil berganti peran.</p>
        {SKENARIO.map((sk) => (
          <button key={sk.kode} type="button" className="tombol" style={{ textAlign: 'left' }} disabled={sibuk} onClick={() => mulai(sk)}>
            {sk.kode}. {sk.judul}
          </button>
        ))}
      </div>
    );
  }

  const l = aktif.langkah[langkah];
  const akhir = langkah === aktif.langkah.length - 1;
  return (
    <div className="kartu tegas tumpuk">
      <div className="antara">
        <h2 style={{ margin: 0 }}>{aktif.kode}. {aktif.judul}</h2>
        <button type="button" className="tautan" onClick={() => setAktif(null)}>Tutup</button>
      </div>
      <p className="label">Langkah {langkah + 1} dari {aktif.langkah.length}</p>
      <p>{l.teks}</p>
      <div className="baris">
        <button type="button" className="tombol" disabled={langkah === 0} onClick={() => pindah(langkah - 1)}>Kembali</button>
        {akhir ? (
          <button type="button" className="tombol utama" onClick={() => setAktif(null)}>Selesai</button>
        ) : (
          <button type="button" className="tombol utama" onClick={() => pindah(langkah + 1)}>Lanjut</button>
        )}
      </div>
    </div>
  );
}
