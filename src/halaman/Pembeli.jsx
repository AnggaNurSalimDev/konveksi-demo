import { useState } from 'react';
import { useAksi, useData } from '../sesi.jsx';
import { Chip, Medan, Muat, Pesan } from '../komponen/umum.jsx';
import { LABEL_SPEK, LABEL_TAHAP, STATUS_VERSI, tanggal, tanggalPendek, teksUkuran } from '../format.js';

export default function Pembeli({ token }) {
  const lihat = useData(token ? `/p/${token}` : null);
  if (!token) return <p className="redup">Pilih order pembeli di bar atas.</p>;
  return (
    <div className="hp">
      <Muat hasil={lihat}>
        {(o) => {
          const menunggu = o.versi.find((v) => v.status === 'MENUNGGU');
          const lain = o.versi.filter((v) => v !== menunggu);
          return (
            <>
              <div>
                <p className="label">Link pembeli · tanpa login</p>
                <h1>{o.kode} · {o.model} {o.jumlah} pcs</h1>
                <p className="label">{o.pembeli}</p>
              </div>

              <div className="kartu tumpuk">
                <h2 style={{ margin: 0 }}>Status produksi</h2>
                {o.tahap.map((t) => {
                  const selesai = t.selesai >= o.jumlah;
                  const aktif = t.tahap === o.tahapSekarang;
                  return (
                    <div key={t.tahap} className="baris" style={{ flexWrap: 'nowrap' }}>
                      <span className="titik" style={{ background: selesai ? 'var(--ok)' : aktif ? 'var(--accent)' : 'transparent', border: selesai || aktif ? 0 : '2px solid #a8a8a3', boxShadow: aktif ? '0 0 0 4px #dce4f8' : 'none' }} />
                      <span style={{ fontWeight: aktif ? 600 : 400, color: selesai || aktif ? 'var(--ink)' : 'var(--quiet)' }}>
                        {LABEL_TAHAP[t.tahap]} · {selesai ? 'selesai' : aktif ? `${t.selesai} dari ${o.jumlah} pcs` : 'belum'}
                      </span>
                    </div>
                  );
                })}
                <div style={{ background: 'var(--accent-soft)', borderRadius: 8, padding: 12 }}>
                  <p className="label">Perkiraan selesai produksi</p>
                  <p style={{ fontSize: 18, fontWeight: 700 }}>{o.perkiraanSelesai ? tanggal(o.perkiraanSelesai) : 'Belum bisa diperkirakan'}</p>
                  <p className="kecil redup">Tanggal yang disepakati: {tanggal(o.deadline)}</p>
                </div>
              </div>

              {menunggu && <LembarSpek token={token} versi={menunggu} sebelumnya={lain[0]} />}

              <div className="kartu tumpuk">
                <h2 style={{ margin: 0 }}>Riwayat spesifikasi</h2>
                {o.versi.map((v) => (
                  <details key={v.id}>
                    <summary className="antara" style={{ display: 'flex' }}><span>Versi {v.nomor} · {tanggalPendek(v.pada)}</span><Chip peta={STATUS_VERSI} nilai={v.status} /></summary>
                    <IsiSpek isi={v.isi} perubahan={v.perubahan} />
                    {v.jawaban?.catatan && <p className="kecil">Catatan Anda: {v.jawaban.catatan}</p>}
                  </details>
                ))}
              </div>
            </>
          );
        }}
      </Muat>
    </div>
  );
}

function IsiSpek({ isi, perubahan = [], sebelumnya = null }) {
  return Object.keys(LABEL_SPEK)
    .filter((f) => isi[f])
    .map((f) => (
      <div key={f}>
        <div className="spek">
          <span>{LABEL_SPEK[f]}</span>
          <strong>{f === 'ukuran' ? teksUkuran(isi.ukuran) : isi[f]}{perubahan.includes(f) && <span className="berubah">BERUBAH</span>}</strong>
        </div>
        {sebelumnya && perubahan.includes(f) && sebelumnya[f] && (
          <div className="spek"><span>Sebelumnya</span><span className="coret">{f === 'ukuran' ? teksUkuran(sebelumnya.ukuran) : sebelumnya[f]}</span></div>
        )}
      </div>
    ));
}

function LembarSpek({ token, versi, sebelumnya }) {
  const aksi = useAksi();
  const [ubah, setUbah] = useState(false);
  const [catatan, setCatatan] = useState('');
  return (
    <div className="kartu awas tumpuk">
      <p className="kecil" style={{ fontWeight: 700, color: 'var(--warn)' }}>MENUNGGU PERSETUJUAN ANDA</p>
      <h2 style={{ margin: 0, fontSize: 18 }}>Lembar spesifikasi versi {versi.nomor}</h2>
      <div style={{ height: 150, borderRadius: 8, background: '#ececea', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="kecil redup">
        {versi.isi.fotoSampel ? <img src={versi.isi.fotoSampel} alt="Foto sampel" style={{ maxHeight: 150 }} /> : '[Foto sampel disetujui]'}
      </div>
      <div>
        <IsiSpek isi={versi.isi} perubahan={versi.perubahan} sebelumnya={sebelumnya?.isi} />
      </div>
      <p className="label">Setelah disetujui, produksi mengikuti versi ini. Perubahan berikutnya menjadi versi baru dan perlu persetujuan lagi.</p>
      {!ubah ? (
        <div className="tumpuk" style={{ gap: 8 }}>
          <button type="button" className="tombol utama" disabled={aksi.sedang} onClick={() => aksi.jalankan(`/p/${token}/spesifikasi/${versi.id}`, { hasil: 'DISETUJUI' }, `Versi ${versi.nomor} disetujui`)}>Setujui versi {versi.nomor}</button>
          <button type="button" className="tombol" onClick={() => setUbah(true)}>Minta perubahan</button>
        </div>
      ) : (
        <form className="tumpuk" onSubmit={(e) => { e.preventDefault(); aksi.jalankan(`/p/${token}/spesifikasi/${versi.id}`, { hasil: 'MINTA_UBAH', catatan }, 'Permintaan perubahan terkirim'); }}>
          <Medan label="Apa yang perlu diubah?"><textarea className="masukan" value={catatan} onChange={(e) => setCatatan(e.target.value)} /></Medan>
          <div className="baris">
            <button type="submit" className="tombol utama" disabled={aksi.sedang}>Kirim</button>
            <button type="button" className="tombol" onClick={() => setUbah(false)}>Batal</button>
          </div>
        </form>
      )}
      <Pesan aksi={aksi} />
    </div>
  );
}
