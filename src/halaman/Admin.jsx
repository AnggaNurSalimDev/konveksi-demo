import { useState } from 'react';
import { useData } from '../sesi.jsx';
import { Chip, Muat, Progres, Tab } from '../komponen/umum.jsx';
import { LABEL_TAHAP, STATUS_DEADLINE, STATUS_VERSI, angka, tanggalPendek } from '../format.js';
import DetailOrder from './DetailOrder.jsx';
import BarisMenunggu from '../komponen/BarisMenunggu.jsx';
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
