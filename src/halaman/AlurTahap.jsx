// Alur tahap di halaman admin: panah per tahap, dan di bawahnya panel tahap yang dipilih:
// berapa barang siap dibagikan, siapa memegang berapa, dan aksi langsung di baris orangnya.

import { useState } from 'react';
import { useAksi } from '../sesi.jsx';
import { Chip, Medan, Pesan, bilangan } from '../komponen/umum.jsx';
import BarisMenunggu from '../komponen/BarisMenunggu.jsx';
import { LABEL_PENYEBAB, LABEL_TAHAP, STATUS_SELISIH } from '../format.js';
import { PENYEBAB } from '../logika/konstanta.js';

export default function AlurTahap({ o, pihak, FormKirim }) {
  const awal = o.tahapSekarang === 'SELESAI' ? 'KIRIM' : o.tahapSekarang;
  const [pilih, setPilih] = useState(awal);
  const panel = o.panelTahap.find((p) => p.tahap === pilih);

  return (
    <div className="kartu tumpuk" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="alur" role="tablist" aria-label="Tahap produksi">
        {o.tahap.map((t) => {
          const p = o.panelTahap.find((x) => x.tahap === t.tahap);
          const selesai = t.selesai >= o.jumlah;
          const perluDicek = p?.pemegang.some((x) => x.status === 'PERLU_DICEK');
          const menunggu = p?.menunggu.length ?? 0;
          const kelas = [pilih === t.tahap && 'dipilih', selesai && 'selesai', t.tahap === o.tahapSekarang && 'sekarang'].filter(Boolean).join(' ');
          return (
            <button key={t.tahap} type="button" role="tab" aria-selected={pilih === t.tahap} className={kelas} onClick={() => setPilih(t.tahap)}>
              <span className="alur-nama">{selesai ? '✓ ' : ''}{LABEL_TAHAP[t.tahap]}</span>
              <span className="alur-angka">{t.selesai}/{o.jumlah}{p?.pakaiQc ? ' lolos' : ''}</span>
              {(perluDicek || menunggu > 0) && (
                <span className="alur-tanda">{perluDicek ? 'selisih' : `${menunggu} menunggu`}</span>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ padding: '4px 18px 18px' }}>
        {pilih === 'KIRIM' ? <FormKirim o={o} /> : panel && <PanelTahap key={pilih} o={o} panel={panel} pihak={pihak} />}
      </div>
    </div>
  );
}

function PanelTahap({ o, panel, pihak }) {
  const [serahkan, setSerahkan] = useState(false);
  const [terima, setTerima] = useState(null); // pekerjaId yang sedang disetori
  const [info, setInfo] = useState(null); // pesan sukses terakhir; form-nya sudah tertutup
  const { stok } = panel;
  return (
    <div className="tumpuk">
      <div className="antara">
        <div>
          <h2 style={{ margin: 0 }}>Tahap {LABEL_TAHAP[panel.tahap]}</h2>
          <p className="label">
            Di admin, siap dibagikan: <strong style={{ color: stok.siap < 0 ? 'var(--bad)' : 'var(--ink)' }}>{Math.max(stok.siap, 0)} pcs</strong>
            {' '}· masuk {stok.masuk}, sudah dibagikan {stok.keluar}
            {stok.siap < 0 && ` · dibagikan ${-stok.siap} pcs lebih banyak dari yang tercatat masuk`}
          </p>
        </div>
        <button type="button" className="tombol utama" onClick={() => setSerahkan((x) => !x)} aria-expanded={serahkan}>
          {serahkan ? 'Tutup' : '+ Serahkan ke…'}
        </button>
      </div>

      {info && <p className="sukses" role="status">{info}</p>}
      {serahkan && <FormSerahkan o={o} tahap={panel.tahap} pihak={pihak} saran={Math.max(stok.siap, 0)} selesai={(pesan) => { setSerahkan(false); setInfo(pesan); }} />}

      {panel.pemegang.length === 0 ? (
        <p className="redup">Belum ada yang mengerjakan tahap ini. Mulai dengan “Serahkan ke…”.</p>
      ) : (
        <div className="gulir">
          <table>
            <thead>
              <tr><th>Dipegang oleh</th><th className="num">Diterima</th><th className="num">Disetor</th><th className="num">Di tangan</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {panel.pemegang.map((p) => (
                <BarisPemegang key={p.pekerjaId} o={o} panel={panel} p={p} buka={terima === p.pekerjaId}
                  ubah={(v) => { setTerima(v ? p.pekerjaId : null); if (v) setInfo(null); }} sukses={(pesan) => { setTerima(null); setInfo(pesan); }} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {panel.menunggu.length > 0 && (
        <div className="tumpuk">
          <h3 style={{ margin: 0 }}>Belum dikonfirmasi penerima</h3>
          {panel.menunggu.map((b) => <BarisMenunggu key={b.id} b={b} />)}
        </div>
      )}
    </div>
  );
}

function BarisPemegang({ o, panel, p, buka, ubah, sukses }) {
  return (
    <>
      <tr>
        <td><strong>{p.nama}</strong>{p.vendor && <span className="kecil redup"> (vendor)</span>}</td>
        <td className="num">{p.diterima}</td>
        <td className="num">{p.disetor}</td>
        <td className="num"><strong>{p.diTangan}</strong></td>
        <td>
          {p.status && <Chip peta={STATUS_SELISIH} nilai={p.status} />}
          {p.pcsMenunggu > 0 && <div className="kecil redup">+{p.pcsMenunggu} pcs menunggu konfirmasi</div>}
        </td>
        <td style={{ textAlign: 'right' }}>
          {(p.diTangan > 0 || buka) && (
            <button type="button" className={`tombol kecil ${buka ? '' : 'utama'}`} onClick={() => ubah(!buka)} aria-expanded={buka}>
              {buka ? 'Tutup' : 'Terima setoran'}
            </button>
          )}
        </td>
      </tr>
      {buka && (
        <tr>
          <td colSpan={6} style={{ background: '#fafaf8' }}>
            <FormSetoran o={o} panel={panel} p={p} selesai={sukses} />
          </td>
        </tr>
      )}
    </>
  );
}

function FormSerahkan({ o, tahap, pihak, saran, selesai }) {
  const aksi = useAksi();
  const [keId, setKeId] = useState('');
  const [pcs, setPcs] = useState(saran > 0 ? String(saran) : '');
  const penerima = pihak.find((p) => p.id === keId);
  const kirim = async (e) => {
    e.preventDefault();
    const pesan = `${bilangan(pcs)} pcs diserahkan ke ${penerima?.nama ?? 'penerima'}. Menunggu konfirmasi.`;
    const r = await aksi.jalankan('/serah-terima', { orderId: o.id, tahap, keId, pcs: bilangan(pcs) }, pesan);
    if (r) selesai(pesan);
  };
  return (
    <form className="catatan tumpuk" onSubmit={kirim}>
      <div className="baris" style={{ alignItems: 'flex-end' }}>
        <Medan label="Serahkan ke">
          <select className="masukan" value={keId} onChange={(e) => setKeId(e.target.value)} required style={{ minWidth: 180 }}>
            <option value="">Pilih orang…</option>
            {pihak.map((p) => <option key={p.id} value={p.id}>{p.nama}{p.peran === 'VENDOR' ? ' (vendor)' : ''}</option>)}
          </select>
        </Medan>
        <Medan label="Jumlah pcs"><input className="masukan" style={{ width: 120 }} inputMode="numeric" value={pcs} onChange={(e) => setPcs(e.target.value)} /></Medan>
        <button className="tombol utama" type="submit" disabled={aksi.sedang}>Serahkan</button>
      </div>
      <p className="kecil redup">Baru dihitung setelah {penerima?.peran === 'VENDOR' ? 'Anda konfirmasi atas nama vendor' : 'penerima menekan “Sesuai” di HP-nya'}.</p>
      <Pesan aksi={aksi} />
    </form>
  );
}

function FormSetoran({ o, panel, p, selesai }) {
  const aksi = useAksi();
  const [lolos, setLolos] = useState('');
  const [pcs, setPcs] = useState(String(p.diTangan));
  const [reject, setReject] = useState({});
  const [terakhir, setTerakhir] = useState(false);
  const totalReject = PENYEBAB.reduce((a, x) => a + (bilangan(reject[x] ?? '') || 0), 0);
  const disetor = panel.pakaiQc ? (bilangan(lolos) || 0) + totalReject : bilangan(pcs) || 0;
  const sisa = p.diTangan - disetor;

  const kirim = async (e) => {
    e.preventDefault();
    const body = { orderId: o.id, tahap: panel.tahap, dariId: p.pekerjaId, terakhir };
    if (panel.pakaiQc) {
      body.lolos = bilangan(lolos) ?? 0;
      body.reject = PENYEBAB.filter((x) => bilangan(reject[x] ?? '') > 0).map((x) => ({ penyebab: x, pcs: bilangan(reject[x]) }));
    } else body.pcs = bilangan(pcs);
    const r = await aksi.jalankan('/setoran', body, `Setoran ${p.nama} dicatat`);
    if (r) selesai(`Setoran ${p.nama} ${disetor} pcs dicatat. Sisa di tangan ${p.nama}: ${r.sisaDiTangan} pcs.`);
  };

  return (
    <form className="tumpuk" onSubmit={kirim}>
      <p><strong>Setoran dari {p.nama}</strong> <span className="redup kecil">· di tangan {p.diTangan} pcs</span></p>
      {panel.pakaiQc ? (
        <div className="kisi" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
          <Medan label="Lolos QC"><input className="masukan" inputMode="numeric" value={lolos} onChange={(e) => setLolos(e.target.value)} autoFocus /></Medan>
          {PENYEBAB.map((x) => (
            <Medan key={x} label={`Reject: ${LABEL_PENYEBAB[x].toLowerCase()}`}>
              <input className="masukan" inputMode="numeric" value={reject[x] ?? ''} onChange={(e) => setReject({ ...reject, [x]: e.target.value })} placeholder="0" />
            </Medan>
          ))}
        </div>
      ) : (
        <Medan label="Jumlah pcs disetor"><input className="masukan" style={{ width: 140 }} inputMode="numeric" value={pcs} onChange={(e) => setPcs(e.target.value)} autoFocus /></Medan>
      )}
      <p className="kecil redup">
        Disetor {disetor} pcs → sisa di tangan {p.nama}: <strong style={{ color: sisa < 0 ? 'var(--bad)' : 'var(--ink)' }}>{sisa}</strong>
        {panel.pakaiQc && ` · reject karena ${LABEL_TAHAP[panel.tahap].toLowerCase()} tidak dibayar; penyebab lain tetap dibayar`}
      </p>
      <label className="cek"><input type="checkbox" checked={terakhir} onChange={(e) => setTerakhir(e.target.checked)} /> Ini setoran terakhir {p.nama} untuk tahap ini</label>
      <div className="baris">
        <button className="tombol utama" type="submit" disabled={aksi.sedang}>Simpan setoran</button>
      </div>
      <Pesan aksi={aksi} />
    </form>
  );
}
