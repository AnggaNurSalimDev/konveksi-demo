import { useState } from 'react';
import { useAksi, useData } from '../sesi.jsx';
import { Chip, Medan, Muat, Pesan } from '../komponen/umum.jsx';
import { LABEL_PENYEBAB, LABEL_TAHAP, STATUS_SELISIH, jamTanggal, labelPeriode, rupiah, tanggalPendek } from '../format.js';

export default function Pekerja() {
  const saya = useData('/saya');
  return (
    <div className="hp">
      <Muat hasil={saya}>
        {(d) => (
          <>
            <div>
              <p className="label">Tampilan HP pekerja</p>
              <h1>Halo, {d.nama}</h1>
            </div>

            {d.perluKonfirmasi.length === 0 && <p className="sukses">Tidak ada serah terima yang perlu dikonfirmasi.</p>}
            {d.perluKonfirmasi.map((k) => <Konfirmasi key={k.id} k={k} />)}

            <div className="kartu tumpuk">
              <h2 style={{ margin: 0 }}>Pekerjaan saya</h2>
              {d.pekerjaan.length === 0 && <p className="redup">Belum ada.</p>}
              {d.pekerjaan.map((p) => (
                <div key={`${p.orderId}${p.tahap}`} className="tumpuk" style={{ gap: 4, borderBottom: '1px solid var(--line-2)', paddingBottom: 10 }}>
                  <div className="antara"><strong>{p.kode} · {LABEL_TAHAP[p.tahap]}</strong><Chip peta={STATUS_SELISIH} nilai={p.status} /></div>
                  <p className="kecil">Diterima {p.diterima} · disetor {p.disetor} · di tangan saya {p.selisih}</p>
                </div>
              ))}
            </div>

            <div className="kartu tumpuk">
              <h2 style={{ margin: 0 }}>Reject saya</h2>
              {d.reject.length === 0 && <p className="redup">Tidak ada reject.</p>}
              {d.reject.map((r, i) => (
                <div key={i}>
                  <p><strong>{r.pcs} pcs</strong> · {r.kode} · penyebab: <strong>{LABEL_PENYEBAB[r.penyebab].toLowerCase()}</strong> <span className="kecil redup">{tanggalPendek(r.pada)}</span></p>
                  <p className="kecil" style={{ color: r.dibayar ? 'var(--ok)' : 'var(--bad)', fontWeight: 600 }}>
                    {r.dibayar ? 'Bukan dari pekerjaan saya, upah tetap dibayar' : 'Dari pekerjaan saya, tidak dibayar'}
                  </p>
                </div>
              ))}
            </div>

            <div className="kartu tumpuk">
              <h2 style={{ margin: 0 }}>Upah {labelPeriode(d.upah.periode)}</h2>
              <p className="label">{d.upah.pcsDibayar} pcs dibayar · berjalan, belum final</p>
              <p style={{ fontSize: 26, fontWeight: 700 }}>{rupiah(d.upah.rupiah)}</p>
              {d.upah.baris.length > 0 && (
                <details>
                  <summary className="kecil">Rincian</summary>
                  {d.upah.baris.map((b) => (
                    <p key={b.refId} className="kecil">{tanggalPendek(b.pada)} · {b.pcsDibayar} pcs × {rupiah(b.tarif)} = {rupiah(b.rupiah)}{b.sumber === 'KERJA_ULANG' ? ' (kerja ulang)' : ''}</p>
                  ))}
                </details>
              )}
            </div>

            {d.final.length > 0 && (
              <div className="kartu tumpuk">
                <h2 style={{ margin: 0 }}>Upah yang sudah final</h2>
                {d.final.map((f) => (
                  <div key={f.id} className="antara"><span>{labelPeriode(f.periode)}</span><strong>{rupiah(f.rupiah)}</strong></div>
                ))}
              </div>
            )}
          </>
        )}
      </Muat>
    </div>
  );
}

function Konfirmasi({ k }) {
  const aksi = useAksi();
  const [tolak, setTolak] = useState(false);
  const [alasan, setAlasan] = useState('');
  return (
    <div className="kartu tegas tumpuk">
      <p className="kecil" style={{ fontWeight: 700, color: 'var(--accent-ink)' }}>PERLU KONFIRMASI{k.koreksi ? ' · KOREKSI' : ''}</p>
      <p style={{ fontSize: 17, fontWeight: 600 }}>Admin menyerahkan {k.pcs} pcs ke Anda</p>
      <p className="label">{k.kode} · tahap {LABEL_TAHAP[k.tahap]} · {jamTanggal(k.dibuatPada)}</p>
      {k.catatan && <p className="kecil">Catatan: {k.catatan}</p>}
      {!tolak ? (
        <div className="baris">
          <button type="button" className="tombol utama" style={{ flex: 1 }} disabled={aksi.sedang} onClick={() => aksi.jalankan(`/serah-terima/${k.id}/konfirmasi`, { hasil: 'DITERIMA' }, 'Terima kasih, sudah dikonfirmasi')}>
            Sesuai, {k.pcs} pcs
          </button>
          <button type="button" className="tombol" style={{ flex: 1 }} onClick={() => setTolak(true)}>Tidak sesuai</button>
        </div>
      ) : (
        <form className="tumpuk" onSubmit={(e) => { e.preventDefault(); aksi.jalankan(`/serah-terima/${k.id}/konfirmasi`, { hasil: 'DITOLAK', alasan }, 'Ditolak; admin akan mengoreksi'); }}>
          <Medan label="Berapa yang Anda terima?"><textarea className="masukan" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Yang saya terima 100 pcs" /></Medan>
          <div className="baris">
            <button type="submit" className="tombol bahaya" disabled={aksi.sedang}>Kirim penolakan</button>
            <button type="button" className="tombol" onClick={() => setTolak(false)}>Batal</button>
          </div>
        </form>
      )}
      <Pesan aksi={aksi} />
    </div>
  );
}
