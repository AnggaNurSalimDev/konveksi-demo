import { useState } from 'react';
import { useAksi, useData, useSesi } from '../sesi.jsx';
import { Chip, Medan, Muat, Pesan, bilangan } from '../komponen/umum.jsx';
import {
  LABEL_PENYEBAB, LABEL_SPEK, LABEL_TAHAP, STATUS_DEADLINE, STATUS_SERAH, STATUS_VERSI,
  bacaUkuran, jamTanggal, tanggal, teksUkuran, ukuranKeTeks,
} from '../format.js';
import { PENYEBAB, TAHAP_QC } from '../logika/konstanta.js';

export default function DetailOrder({ id, kembali }) {
  const detail = useData(`/order/${id}`);
  const pengguna = useData('/pengguna');
  return (
    <Muat hasil={detail}>
      {(o) => {
        const pihak = (pengguna.data ?? []).filter((p) => p.status === 'AKTIF' && (p.peran === 'PEKERJA' || p.peran === 'VENDOR'));
        const tahapKerja = o.tahapan.filter((t) => t !== 'KIRIM');
        return (
          <>
            <div className="antara">
              <div>
                <button type="button" className="tautan" onClick={kembali}>← Semua order</button>
                <h1 style={{ marginTop: 6 }}>{o.kode} · {o.model} · {o.pembeli}</h1>
                <p className="label">{o.jumlah} pcs · deadline {tanggal(o.deadline)} · produksi mengikuti spesifikasi v{o.spek.nomorDisetujui ?? '—'}</p>
              </div>
              <Chip peta={STATUS_DEADLINE} nilai={o.statusDeadline} />
            </div>

            <div className="langkah-tahap">
              {o.tahap.map((t) => (
                <div key={t.tahap} className={t.selesai >= o.jumlah ? 'selesai' : t.tahap === o.tahapSekarang ? 'aktif' : ''}>
                  <strong>{LABEL_TAHAP[t.tahap]}</strong><br />{t.selesai} / {o.jumlah}{TAHAP_QC.includes(t.tahap) ? ' lolos' : ''}
                </div>
              ))}
            </div>

            <div className="kisi-2">
              <FormSerahTerima o={o} pihak={pihak} tahapKerja={tahapKerja} />
              <FormSetoran o={o} pihak={pihak} tahapKerja={tahapKerja} />
            </div>

            <div className="kisi-2">
              <Spesifikasi o={o} />
              <div className="tumpuk">
                <LinkPembeli token={o.tokenPembeli} />
                <FormKerjaUlang o={o} pekerja={pihak.filter((p) => p.peran === 'PEKERJA')} />
                <FormKirim o={o} />
              </div>
            </div>

            <Jejak o={o} />
          </>
        );
      }}
    </Muat>
  );
}

function FormSerahTerima({ o, pihak, tahapKerja }) {
  const aksi = useAksi();
  const [tahap, setTahap] = useState(tahapKerja[0]);
  const [keId, setKeId] = useState('');
  const [pcs, setPcs] = useState('');
  const penerima = pihak.find((p) => p.id === keId);
  return (
    <form className="kartu tumpuk" onSubmit={(e) => { e.preventDefault(); aksi.jalankan('/serah-terima', { orderId: o.id, tahap, keId, pcs: bilangan(pcs) }, `Tercatat. Menunggu konfirmasi ${penerima?.nama ?? 'penerima'}`); }}>
      <h2 style={{ margin: 0 }}>Catat serah terima keluar</h2>
      <div className="kisi" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <Medan label="Tahap"><select className="masukan" value={tahap} onChange={(e) => setTahap(e.target.value)}>{tahapKerja.map((t) => <option key={t} value={t}>{LABEL_TAHAP[t]}</option>)}</select></Medan>
        <Medan label="Ke"><select className="masukan" value={keId} onChange={(e) => setKeId(e.target.value)} required><option value="">Pilih…</option>{pihak.map((p) => <option key={p.id} value={p.id}>{p.nama}{p.peran === 'VENDOR' ? ' (vendor)' : ''}</option>)}</select></Medan>
        <Medan label="Jumlah pcs"><input className="masukan" inputMode="numeric" value={pcs} onChange={(e) => setPcs(e.target.value)} /></Medan>
      </div>
      <button className="tombol utama" type="submit" disabled={aksi.sedang}>Simpan dan minta konfirmasi</button>
      <Pesan aksi={aksi} />
      <p className="label">Baru dihitung setelah penerima mengonfirmasi jumlahnya. Vendor tanpa akun dikonfirmasi admin dari tab “Menunggu konfirmasi”.</p>
    </form>
  );
}

function FormSetoran({ o, pihak, tahapKerja }) {
  const aksi = useAksi();
  const [tahap, setTahap] = useState(tahapKerja.find((t) => TAHAP_QC.includes(t)) ?? tahapKerja[0]);
  const [dariId, setDariId] = useState('');
  const [lolos, setLolos] = useState('');
  const [pcs, setPcs] = useState('');
  const [reject, setReject] = useState({});
  const [terakhir, setTerakhir] = useState(false);
  const pakaiQc = TAHAP_QC.includes(tahap);
  const kirim = (e) => {
    e.preventDefault();
    const body = { orderId: o.id, tahap, dariId, terakhir };
    if (pakaiQc) {
      body.lolos = bilangan(lolos) ?? 0;
      body.reject = PENYEBAB.filter((p) => bilangan(reject[p] ?? '') > 0).map((p) => ({ penyebab: p, pcs: bilangan(reject[p]) }));
    } else body.pcs = bilangan(pcs);
    aksi.jalankan('/setoran', body, 'Setoran dicatat').then((r) => {
      if (r) {
        setLolos('');
        setPcs('');
        setReject({});
        setTerakhir(false);
      }
    });
  };
  const totalReject = PENYEBAB.reduce((a, p) => a + (bilangan(reject[p] ?? '') || 0), 0);
  return (
    <form className="kartu tumpuk" onSubmit={kirim}>
      <h2 style={{ margin: 0 }}>Setoran {pakaiQc ? '+ QC' : ''}</h2>
      <div className="kisi" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <Medan label="Tahap"><select className="masukan" value={tahap} onChange={(e) => setTahap(e.target.value)}>{tahapKerja.map((t) => <option key={t} value={t}>{LABEL_TAHAP[t]}</option>)}</select></Medan>
        <Medan label="Dari"><select className="masukan" value={dariId} onChange={(e) => setDariId(e.target.value)} required><option value="">Pilih…</option>{pihak.map((p) => <option key={p.id} value={p.id}>{p.nama}{p.peran === 'VENDOR' ? ' (vendor)' : ''}</option>)}</select></Medan>
        {pakaiQc ? (
          <Medan label="Lolos QC"><input className="masukan" inputMode="numeric" value={lolos} onChange={(e) => setLolos(e.target.value)} /></Medan>
        ) : (
          <Medan label="Jumlah pcs"><input className="masukan" inputMode="numeric" value={pcs} onChange={(e) => setPcs(e.target.value)} /></Medan>
        )}
      </div>
      {pakaiQc && (
        <fieldset>
          <legend>Reject per penyebab (wajib diisi penyebabnya)</legend>
          <div className="kisi" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            {PENYEBAB.map((p) => (
              <Medan key={p} label={LABEL_PENYEBAB[p]}><input className="masukan" inputMode="numeric" value={reject[p] ?? ''} onChange={(e) => setReject({ ...reject, [p]: e.target.value })} placeholder="0" /></Medan>
            ))}
          </div>
          <p className="kecil redup" style={{ marginTop: 6 }}>Disetor = lolos + reject = {(bilangan(lolos) || 0) + totalReject} pcs. Reject karena {LABEL_TAHAP[tahap].toLowerCase()} tidak dibayar; penyebab lain tetap dibayar.</p>
        </fieldset>
      )}
      <label className="cek"><input type="checkbox" checked={terakhir} onChange={(e) => setTerakhir(e.target.checked)} /> Ini setoran terakhir pekerja ini untuk tahap ini</label>
      <button className="tombol utama" type="submit" disabled={aksi.sedang}>Simpan setoran</button>
      <Pesan aksi={aksi} />
    </form>
  );
}

function Spesifikasi({ o }) {
  const aksi = useAksi();
  const terbaru = o.versi.at(-1);
  const [buka, setBuka] = useState(false);
  const [isi, setIsi] = useState(null);
  const mulai = () => {
    setIsi({ ...terbaru.isi, ukuran: ukuranKeTeks(terbaru.isi.ukuran) });
    setBuka(true);
  };
  const kirim = (e) => {
    e.preventDefault();
    const bersih = Object.fromEntries(Object.entries(isi).filter(([, v]) => v !== null && v !== ''));
    aksi.jalankan(`/order/${o.id}/spesifikasi`, { isi: { ...bersih, ukuran: bacaUkuran(isi.ukuran) } }, 'Versi baru diterbitkan; menunggu persetujuan pembeli').then((r) => r && setBuka(false));
  };
  return (
    <div className="kartu tumpuk">
      <div className="antara">
        <h2 style={{ margin: 0 }}>Spesifikasi</h2>
        {!buka && <button type="button" className="tombol kecil" onClick={mulai}>Terbitkan versi baru</button>}
      </div>
      {buka ? (
        <form className="tumpuk" onSubmit={kirim}>
          {['model', 'bahan', 'warna', 'logo', 'ukuran', 'catatan'].map((f) => (
            <Medan key={f} label={f === 'ukuran' ? 'Ukuran (contoh: S:10, M:30)' : LABEL_SPEK[f]}>
              <input className="masukan" value={isi[f] ?? ''} onChange={(e) => setIsi({ ...isi, [f]: e.target.value })} />
            </Medan>
          ))}
          <div className="baris">
            <button className="tombol utama" type="submit" disabled={aksi.sedang}>Terbitkan versi {terbaru.nomor + 1}</button>
            <button className="tombol" type="button" onClick={() => setBuka(false)}>Batal</button>
          </div>
        </form>
      ) : (
        [...o.versi].reverse().map((v) => (
          <details key={v.id} open={v.id === terbaru.id}>
            <summary className="baris" style={{ display: 'flex' }}>
              <strong>Versi {v.nomor}</strong> <Chip peta={STATUS_VERSI} nilai={v.status} />
              {v.perubahan.length > 0 && <span className="kecil redup">berubah: {v.perubahan.map((f) => LABEL_SPEK[f].toLowerCase()).join(', ')}</span>}
            </summary>
            {Object.keys(LABEL_SPEK).filter((f) => v.isi[f]).map((f) => (
              <div key={f} className="spek"><span>{LABEL_SPEK[f]}</span><strong>{f === 'ukuran' ? teksUkuran(v.isi.ukuran) : v.isi[f]}{v.perubahan.includes(f) && <span className="berubah">BERUBAH</span>}</strong></div>
            ))}
          </details>
        ))
      )}
      <Pesan aksi={aksi} />
    </div>
  );
}

function LinkPembeli({ token }) {
  const { setSesi } = useSesi();
  if (!token) return null;
  const url = `${window.location.origin}${window.location.pathname}#/p/${token}`;
  return (
    <div className="kartu tumpuk">
      <h2 style={{ margin: 0 }}>Link pembeli</h2>
      <p className="kecil" style={{ wordBreak: 'break-all' }}>{url}</p>
      <div className="baris">
        <button type="button" className="tombol kecil" onClick={() => navigator.clipboard?.writeText(url)}>Salin link</button>
        <button type="button" className="tombol kecil" onClick={() => setSesi({ peran: 'PEMBELI', penggunaId: null, token })}>Buka sebagai pembeli</button>
      </div>
      <p className="label">Tanpa login. Pembeli hanya melihat status dan spesifikasi, tanpa nama pekerja, upah, atau selisih.</p>
    </div>
  );
}

function FormKerjaUlang({ o, pekerja }) {
  const aksi = useAksi();
  const tahapQc = o.tahapan.filter((t) => TAHAP_QC.includes(t));
  const [pekerjaId, setPekerjaId] = useState('');
  const [tahap, setTahap] = useState(tahapQc[0]);
  const [pcs, setPcs] = useState('');
  const [alasan, setAlasan] = useState('');
  const terbaru = o.versi.at(-1);
  if (o.versi.length < 2) return null;
  return (
    <form className="kartu tumpuk" onSubmit={(e) => { e.preventDefault(); aksi.jalankan('/kerja-ulang', { orderId: o.id, pekerjaId, tahap, pcs: bilangan(pcs), spekVersiId: terbaru.id, alasan }, 'Kerja ulang dicatat; menunggu keputusan owner'); }}>
      <h2 style={{ margin: 0 }}>Kerja ulang karena versi {terbaru.nomor}</h2>
      <div className="kisi" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
        <Medan label="Pekerja"><select className="masukan" value={pekerjaId} onChange={(e) => setPekerjaId(e.target.value)} required><option value="">Pilih…</option>{pekerja.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}</select></Medan>
        <Medan label="Tahap"><select className="masukan" value={tahap} onChange={(e) => setTahap(e.target.value)}>{tahapQc.map((t) => <option key={t} value={t}>{LABEL_TAHAP[t]}</option>)}</select></Medan>
        <Medan label="Pcs"><input className="masukan" inputMode="numeric" value={pcs} onChange={(e) => setPcs(e.target.value)} /></Medan>
      </div>
      <Medan label="Alasan"><input className="masukan" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Bongkar dan ganti bordir logo" /></Medan>
      <button className="tombol" type="submit" disabled={aksi.sedang}>Catat kerja ulang</button>
      <Pesan aksi={aksi} />
    </form>
  );
}

function FormKirim({ o }) {
  const aksi = useAksi();
  const [pcs, setPcs] = useState('');
  const siap = o.progres.lolos - o.progres.dikirim;
  return (
    <form className="kartu tumpuk" onSubmit={(e) => { e.preventDefault(); aksi.jalankan(`/order/${o.id}/pengiriman`, { pcs: bilangan(pcs) }, 'Pengiriman dicatat'); }}>
      <h2 style={{ margin: 0 }}>Kirim ke pembeli</h2>
      <p className="label">Lolos QC {o.progres.lolos} · sudah dikirim {o.progres.dikirim} · siap kirim {siap}</p>
      <div className="baris" style={{ alignItems: 'flex-end' }}>
        <Medan label="Pcs dikirim"><input className="masukan" style={{ width: 140 }} inputMode="numeric" value={pcs} onChange={(e) => setPcs(e.target.value)} /></Medan>
        <button className="tombol" type="submit" disabled={aksi.sedang || siap <= 0}>Catat kirim</button>
      </div>
      <Pesan aksi={aksi} />
    </form>
  );
}

function Jejak({ o }) {
  return (
    <div className="kartu" style={{ padding: 0 }}>
      <h2 style={{ padding: '16px 18px 0' }}>Jejak serah terima (tidak pernah ditimpa)</h2>
      <div className="gulir">
        <table>
          <thead><tr><th>Waktu</th><th>Tahap</th><th>Dari → ke</th><th className="num">Pcs</th><th>QC</th><th>Status</th></tr></thead>
          <tbody>
            {o.jejak.map((j) => (
              <tr key={j.id}>
                <td className={j.status === 'DIKOREKSI' ? 'redup' : ''}>{jamTanggal(j.dibuatPada)}</td>
                <td>{LABEL_TAHAP[j.tahap]}</td>
                <td>{j.dari} → {j.ke}{j.koreksiDariId && <span className="kecil redup"> (koreksi)</span>}{j.terakhir && <span className="kecil redup"> · setoran terakhir</span>}</td>
                <td className={`num ${j.status === 'DIKOREKSI' ? 'coret' : ''}`}>{j.pcs}</td>
                <td className="kecil">{j.qc ? `${j.qc.lolos} lolos${j.qc.reject.map((r) => ` · ${r.pcs} ${LABEL_PENYEBAB[r.penyebab].toLowerCase()}`).join('')}` : ''}</td>
                <td>
                  <Chip peta={STATUS_SERAH} nilai={j.status} />
                  {j.atasNamaVendor && <span className="kecil redup"> atas nama vendor</span>}
                  {j.alasanTolak && <div className="kecil redup">“{j.alasanTolak}”</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
