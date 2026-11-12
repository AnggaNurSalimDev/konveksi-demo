import { useState } from 'react';
import { useAksi } from '../sesi.jsx';
import { Chip, Medan, Pesan, bilangan } from './umum.jsx';
import { LABEL_TAHAP, STATUS_SERAH, jamTanggal } from '../format.js';

/** Satu serah terima keluar yang belum sah: konfirmasi atas nama vendor, atau koreksi jumlah (baris baru). */
export default function BarisMenunggu({ b, buka }) {
  const aksi = useAksi();
  const [pcs, setPcs] = useState('');
  const [alasan, setAlasan] = useState('');
  const [koreksi, setKoreksi] = useState(false);
  return (
    <div className={`kartu tumpuk ${b.status === 'DITOLAK' ? 'awas' : ''}`}>
      <div className="antara">
        <strong>{b.kode} · {LABEL_TAHAP[b.tahap]} · ke {b.ke} · {b.pcs} pcs</strong>
        <Chip peta={STATUS_SERAH} nilai={b.status} />
      </div>
      {b.alasanTolak && <p>{b.ke}: “{b.alasanTolak}”</p>}
      <p className="kecil redup">{jamTanggal(b.dibuatPada)}</p>
      <div className="baris">
        {buka && <button type="button" className="tombol kecil" onClick={() => buka(b.orderId)}>Buka order</button>}
        {b.keVendor && b.status === 'MENUNGGU' && (
          <button type="button" className="tombol kecil" disabled={aksi.sedang} onClick={() => aksi.jalankan(`/serah-terima/${b.id}/konfirmasi`, { hasil: 'DITERIMA' }, 'Dikonfirmasi atas nama vendor')}>
            Konfirmasi atas nama vendor
          </button>
        )}
        <button type="button" className="tombol kecil" onClick={() => setKoreksi((x) => !x)}>Koreksi jumlah</button>
      </div>
      {koreksi && (
        <form className="baris" style={{ alignItems: 'flex-end' }} onSubmit={(e) => { e.preventDefault(); aksi.jalankan(`/serah-terima/${b.id}/koreksi`, { pcs: bilangan(pcs), alasan }, 'Koreksi dibuat sebagai baris baru'); }}>
          <Medan label="Jumlah benar"><input className="masukan" style={{ width: 120 }} inputMode="numeric" value={pcs} onChange={(e) => setPcs(e.target.value)} /></Medan>
          <Medan label="Alasan"><input className="masukan" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Salah ketik" /></Medan>
          <button className="tombol utama" type="submit" disabled={aksi.sedang}>Simpan koreksi</button>
        </form>
      )}
      <Pesan aksi={aksi} />
    </div>
  );
}
