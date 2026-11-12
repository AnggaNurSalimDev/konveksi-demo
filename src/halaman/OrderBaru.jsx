import { useState } from 'react';
import { useAksi, useData } from '../sesi.jsx';
import { Medan, Muat, Pesan, bilangan } from '../komponen/umum.jsx';
import { LABEL_TAHAP, bacaUkuran } from '../format.js';
import { TAHAP } from '../logika/konstanta.js';
import { wib } from '../logika/waktu.js';

const WAJIB = ['POTONG', 'JAHIT', 'KIRIM'];

export default function OrderBaru({ selesai }) {
  const model = useData('/model');
  const aksi = useAksi();
  const [f, setF] = useState({ kode: 'ORD-040', pembeli: '', modelId: '', jumlah: '', harga: '', deadline: '', modelSpek: '', bahan: '', warna: '', logo: '', ukuran: '' });
  const [tahap, setTahap] = useState(new Set(WAJIB));
  const ubah = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const kirim = async (e) => {
    e.preventDefault();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f.deadline);
    const body = {
      kode: f.kode.trim().toUpperCase(),
      pembeli: f.pembeli,
      modelId: f.modelId,
      jumlah: bilangan(f.jumlah),
      hargaPerPcs: bilangan(f.harga),
      deadline: m ? wib(Number(m[1]), Number(m[2]), Number(m[3]), 17) : undefined,
      tahapan: [...tahap],
      isiSpek: { model: f.modelSpek, bahan: f.bahan || undefined, warna: f.warna || undefined, logo: f.logo || undefined, ukuran: bacaUkuran(f.ukuran) },
    };
    const r = await aksi.jalankan('/order', body, 'Order dibuat beserta spesifikasi v1 dan link pembeli');
    if (r) selesai(r.id);
  };

  return (
    <Muat hasil={model}>
      {(daftarModel) => (
        <form className="kartu tumpuk" onSubmit={kirim} style={{ maxWidth: 760 }}>
          <h2 style={{ margin: 0 }}>Order baru</h2>
          <div className="kisi">
            <Medan label="Kode"><input className="masukan" value={f.kode} onChange={ubah('kode')} /></Medan>
            <Medan label="Pembeli"><input className="masukan" value={f.pembeli} onChange={ubah('pembeli')} placeholder="PT Maju Bersama" /></Medan>
            <Medan label="Model">
              <select className="masukan" value={f.modelId} onChange={ubah('modelId')}>
                <option value="">Pilih…</option>
                {daftarModel.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
              </select>
            </Medan>
            <Medan label="Jumlah pcs"><input className="masukan" inputMode="numeric" value={f.jumlah} onChange={ubah('jumlah')} /></Medan>
            <Medan label="Harga per pcs (Rp)"><input className="masukan" inputMode="numeric" value={f.harga} onChange={ubah('harga')} /></Medan>
            <Medan label="Deadline"><input className="masukan" type="date" value={f.deadline} onChange={ubah('deadline')} /></Medan>
          </div>
          <fieldset>
            <legend>Tahapan</legend>
            <div className="baris">
              {TAHAP.map((t) => (
                <label key={t} className="cek" style={{ marginRight: 12 }}>
                  <input type="checkbox" checked={tahap.has(t)} disabled={WAJIB.includes(t)}
                    onChange={(e) => { const s = new Set(tahap); if (e.target.checked) s.add(t); else s.delete(t); setTahap(s); }} />
                  {LABEL_TAHAP[t]}
                </label>
              ))}
            </div>
          </fieldset>
          <h3 style={{ margin: '6px 0 0' }}>Spesifikasi versi 1</h3>
          <div className="kisi">
            <Medan label="Model detail"><input className="masukan" value={f.modelSpek} onChange={ubah('modelSpek')} placeholder="Polo lengan pendek" /></Medan>
            <Medan label="Bahan"><input className="masukan" value={f.bahan} onChange={ubah('bahan')} /></Medan>
            <Medan label="Warna"><input className="masukan" value={f.warna} onChange={ubah('warna')} /></Medan>
            <Medan label="Logo"><input className="masukan" value={f.logo} onChange={ubah('logo')} /></Medan>
          </div>
          <Medan label="Ukuran (contoh: S:10, M:30, L:25) — total harus sama dengan jumlah pcs"><input className="masukan" value={f.ukuran} onChange={ubah('ukuran')} /></Medan>
          <button className="tombol utama" type="submit" disabled={aksi.sedang} style={{ alignSelf: 'flex-start' }}>Buat order</button>
          <Pesan aksi={aksi} />
        </form>
      )}
    </Muat>
  );
}
