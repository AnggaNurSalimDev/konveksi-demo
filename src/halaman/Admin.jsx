import { useState } from 'react';
import { useAksi, useData } from '../sesi.jsx';
import { Chip, Medan, Muat, Pesan, Progres, Tab, bilangan } from '../komponen/umum.jsx';
import { LABEL_TAHAP, STATUS_DEADLINE, STATUS_SERAH, STATUS_VERSI, angka, jamTanggal, tanggalPendek } from '../format.js';
import DetailOrder from './DetailOrder.jsx';
import OrderBaru from './OrderBaru.jsx';

export default function Admin() {
  const [tab, setTab] = useState('order');
  const [orderId, setOrderId] = useState(null);
  const buka = (id) => {
    setOrderId(id);
    setTab('order');
  };
  return (
    <>
      <div>
        <p className="label">Masuk sebagai Admin produksi</p>
        <h1>Rina</h1>
      </div>
      <Tab pilihan={[['order', 'Order'], ['menunggu', 'Menunggu konfirmasi'], ['baru', '+ Order baru']]} nilai={tab} ubah={(t) => { setTab(t); if (t === 'order') setOrderId(null); }} />
      {tab === 'order' && (orderId ? <DetailOrder id={orderId} kembali={() => setOrderId(null)} /> : <DaftarOrder buka={buka} />)}
      {tab === 'menunggu' && <Menunggu buka={buka} />}
      {tab === 'baru' && <OrderBaru selesai={buka} />}
    </>
  );
}

function DaftarOrder({ buka }) {
  const order = useData('/order');
  return (
    <div className="kartu" style={{ padding: 0 }}>
      <Muat hasil={order}>
        {(daftar) => (
          <div className="gulir">
            <table>
              <thead><tr><th>Order</th><th>Pembeli</th><th className="num">Jumlah</th><th>Tahap sekarang</th><th>Lolos QC</th><th>Deadline</th><th>Status</th><th>Spesifikasi</th></tr></thead>
              <tbody>
                {daftar.map((o) => (
                  <tr key={o.id} className="klik" onClick={() => buka(o.id)}>
                    <td><button type="button" className="tautan" onClick={() => buka(o.id)}>{o.kode}</button><br /><span className="kecil redup">{o.model}</span></td>
                    <td>{o.pembeli}</td>
                    <td className="num">{angka(o.jumlah)}</td>
                    <td>{LABEL_TAHAP[o.tahapSekarang]}</td>
                    <td><Progres persen={o.progres.persen} /></td>
                    <td>{tanggalPendek(o.deadline)}</td>
                    <td><Chip peta={STATUS_DEADLINE} nilai={o.statusDeadline} /></td>
                    <td>v{o.spek.nomorTerbaru} <Chip peta={STATUS_VERSI} nilai={o.spek.statusTerbaru} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Muat>
    </div>
  );
}

function Menunggu({ buka }) {
  const daftar = useData('/serah-terima/menunggu');
  return (
    <>
      <p className="label">Serah terima keluar yang belum sah. Baris yang ditolak penerima dikoreksi dengan baris baru; baris lama tetap tersimpan.</p>
      <Muat hasil={daftar}>
        {(d) =>
          d.length === 0 ? (
            <p className="sukses">Semua serah terima sudah dikonfirmasi.</p>
          ) : (
            <div className="tumpuk">
              {d.map((b) => <BarisMenunggu key={b.id} b={b} buka={buka} />)}
            </div>
          )
        }
      </Muat>
    </>
  );
}

export function BarisMenunggu({ b, buka }) {
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
