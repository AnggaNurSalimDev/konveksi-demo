import { useState } from 'react';
import { useAksi, useData } from '../sesi.jsx';
import { Chip, Medan, Muat, Pesan, Progres, Tab, bilangan } from '../komponen/umum.jsx';
import {
  LABEL_PENYEBAB, LABEL_TAHAP, STATUS_DEADLINE, STATUS_SELISIH, STATUS_VERSI,
  angka, jamTanggal, labelPeriode, rupiah, tanggal, tanggalPendek,
} from '../format.js';
import { periodeSebelum, periodeUpah, awalHariWib, HARI } from '../logika/waktu.js';

export default function Owner() {
  const [tab, setTab] = useState('ringkasan');
  return (
    <>
      <div>
        <p className="label">Masuk sebagai Owner</p>
        <h1>Pak Hendra</h1>
      </div>
      <Tab
        pilihan={[['ringkasan', 'Ringkasan'], ['upah', 'Upah'], ['kerjaUlang', 'Kerja ulang'], ['tarif', 'Tarif per model']]}
        nilai={tab}
        ubah={setTab}
      />
      {tab === 'ringkasan' && <Ringkasan />}
      {tab === 'upah' && <Upah />}
      {tab === 'kerjaUlang' && <KerjaUlang />}
      {tab === 'tarif' && <Tarif />}
    </>
  );
}

function Ringkasan() {
  const ringkasan = useData('/ringkasan');
  const order = useData('/order');
  const selisih = useData('/selisih');
  return (
    <>
      <Muat hasil={ringkasan}>
        {(r) => (
          <div className="kisi">
            <div className="kartu"><p className="label">Order berjalan</p><p className="angka">{r.orderBerjalan}</p></div>
            <div className={`kartu ${r.terancam ? 'awas' : ''}`}><p className="label">Terancam telat</p><p className="angka">{r.terancam}</p></div>
            <div className={`kartu ${r.selisihPerluDicek ? 'awas' : ''}`}><p className="label">Selisih perlu dicek</p><p className="angka">{r.selisihPerluDicek} pcs</p></div>
            <div className="kartu"><p className="label">Upah {labelPeriode(r.periodeLalu)} belum final</p><p className="angka">{r.upahMenungguFinal.length} orang</p></div>
          </div>
        )}
      </Muat>

      <div className="kartu" style={{ padding: 0 }}>
        <h2 style={{ padding: '16px 18px 0' }}>Order</h2>
        <Muat hasil={order}>
          {(daftar) => (
            <div className="gulir">
              <table>
                <thead>
                  <tr><th>Order</th><th>Pembeli</th><th className="num">Jumlah</th><th>Tahap sekarang</th><th>Lolos QC</th><th>Deadline</th><th>Status</th><th>Spesifikasi</th></tr>
                </thead>
                <tbody>
                  {daftar.map((o) => (
                    <tr key={o.id}>
                      <td><strong>{o.kode}</strong><br /><span className="kecil redup">{o.model}</span></td>
                      <td>{o.pembeli}</td>
                      <td className="num">{angka(o.jumlah)}</td>
                      <td>{LABEL_TAHAP[o.tahapSekarang]}</td>
                      <td><Progres persen={o.progres.persen} /></td>
                      <td>{tanggalPendek(o.deadline)}{o.perkiraanSelesai && <><br /><span className="kecil redup">perkiraan {tanggalPendek(o.perkiraanSelesai)}</span></>}</td>
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

      <div className="kisi-2">
        <div className="kartu tumpuk">
          <h2 style={{ margin: 0 }}>Selisih pcs</h2>
          <Muat hasil={selisih}>
            {(daftar) => {
              const dicek = daftar.filter((r) => r.status === 'PERLU_DICEK');
              const jalan = daftar.filter((r) => r.status === 'DIKERJAKAN');
              return (
                <>
                  {dicek.length === 0 && <p className="sukses">Tidak ada selisih yang perlu dicek.</p>}
                  {dicek.map((r) => (
                    <div key={`${r.pekerjaId}${r.orderId}${r.tahap}`} className="catatan">
                      <strong>{r.pekerja} · {r.kode} · {LABEL_TAHAP[r.tahap]}</strong>
                      <p className="kecil">Diterima {r.diterima} − disetor {r.disetor} (setoran terakhir sudah masuk)</p>
                      <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--warn)' }}>Selisih {r.selisih} pcs</p>
                    </div>
                  ))}
                  {jalan.length > 0 && (
                    <details>
                      <summary className="kecil redup">Masih di tangan pekerja (sedang dikerjakan): {jalan.length}</summary>
                      <table>
                        <tbody>
                          {jalan.map((r) => (
                            <tr key={`${r.pekerjaId}${r.orderId}${r.tahap}`}>
                              <td>{r.pekerja}</td><td>{r.kode}</td><td>{LABEL_TAHAP[r.tahap]}</td><td className="num">{r.selisih} pcs</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </details>
                  )}
                </>
              );
            }}
          </Muat>
        </div>

        <div className="kartu tumpuk">
          <h2 style={{ margin: 0 }}>Reject 7 hari terakhir, per penyebab</h2>
          <Muat hasil={ringkasan}>
            {(r) => {
              const maks = Math.max(1, ...r.rejectMingguIni.map((x) => x.pcs));
              return r.rejectMingguIni.map((x) => (
                <div key={x.penyebab} className="baris" style={{ flexWrap: 'nowrap' }}>
                  <span style={{ width: 76 }}>{LABEL_PENYEBAB[x.penyebab]}</span>
                  <div style={{ flex: 1, height: 10, background: '#ececea', borderRadius: 5 }}>
                    <div style={{ width: `${(x.pcs / maks) * 100}%`, height: 10, background: 'var(--accent)', borderRadius: 5 }} />
                  </div>
                  <span style={{ width: 32, textAlign: 'right' }}>{x.pcs}</span>
                </div>
              ));
            }}
          </Muat>
          <p className="label">Reject tidak dibayar hanya bila penyebabnya tahap pekerja itu sendiri.</p>
        </div>
      </div>
    </>
  );
}

function Upah() {
  const [periode, setPeriode] = useState(null);
  const upah = useData(periode ? `/upah?periode=${periode}` : '/upah');
  const aksi = useAksi();
  const sekarang = upah.data?.sekarang;
  const berjalan = sekarang ? periodeUpah(sekarang) : null;
  const pilihan = berjalan ? [berjalan, periodeSebelum(berjalan), periodeSebelum(periodeSebelum(berjalan))] : [];
  const aktif = periode ?? berjalan;
  return (
    <>
      <div className="antara">
        <Medan label="Periode">
          <select className="masukan" value={aktif ?? ''} onChange={(e) => { setPeriode(e.target.value); aksi.bersihkan(); }}>
            {pilihan.map((p) => <option key={p} value={p}>{labelPeriode(p)}{p === berjalan ? ' (berjalan)' : ''}</option>)}
          </select>
        </Medan>
        <p className="label" style={{ maxWidth: 420 }}>Upah = (lolos + reject yang bukan salah tahap pekerja) × tarif model pada tanggal setor. Bisa difinalkan setelah periode berakhir.</p>
      </div>
      <Pesan aksi={aksi} />
      <Muat hasil={upah}>
        {(u) => (
          <div className="tumpuk">
            {u.daftar.map((p) => (
              <div key={p.pekerjaId} className="kartu tumpuk">
                <div className="antara">
                  <div>
                    <h2 style={{ margin: 0 }}>{p.pekerja}</h2>
                    <p className="label">{p.pcsDibayar} pcs dibayar</p>
                  </div>
                  <div className="baris">
                    <span style={{ fontSize: 22, fontWeight: 700 }}>{rupiah(p.rupiah)}</span>
                    {p.final ? (
                      <span className="chip ok">Final {jamTanggal(p.final.pada)}</span>
                    ) : (
                      <button className="tombol utama" type="button" disabled={aksi.sedang || p.baris.length === 0}
                        onClick={() => aksi.jalankan(`/upah/${u.periode}/finalisasi`, { pekerjaId: p.pekerjaId }, `Upah ${p.pekerja} difinalkan`)}>
                        Finalkan upah
                      </button>
                    )}
                  </div>
                </div>
                {p.tarifKosong.length > 0 && <p className="galat">Ada setoran yang tarifnya belum diatur.</p>}
                {p.baris.length > 0 && (
                  <div className="gulir">
                    <table>
                      <thead><tr><th>Tanggal</th><th>Order</th><th>Sumber</th><th className="num">Lolos</th><th className="num">Reject dibayar</th><th className="num">Reject tidak dibayar</th><th className="num">Pcs dibayar</th><th className="num">Tarif</th><th className="num">Jumlah</th></tr></thead>
                      <tbody>
                        {p.baris.map((b) => (
                          <tr key={b.refId}>
                            <td>{tanggalPendek(b.pada)}</td>
                            <td>{b.kode} · {LABEL_TAHAP[b.tahap]}</td>
                            <td>{b.sumber === 'SETORAN' ? 'Setoran' : 'Kerja ulang'}</td>
                            <td className="num">{b.lolos}</td>
                            <td className="num">{b.rejectDibayar}</td>
                            <td className="num">{b.rejectTidakDibayar}</td>
                            <td className="num"><strong>{b.pcsDibayar}</strong></td>
                            <td className="num">{rupiah(b.tarif)}</td>
                            <td className="num">{rupiah(b.rupiah)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Muat>
    </>
  );
}

function KerjaUlang() {
  const daftar = useData('/kerja-ulang');
  const aksi = useAksi();
  return (
    <>
      <p className="label">Pcs yang dikerjakan ulang karena pembeli mengubah spesifikasi. Owner memutuskan sekali: dibayar ke pekerja atau tidak, dan ditagih ke pembeli atau tidak.</p>
      <Pesan aksi={aksi} />
      <Muat hasil={daftar}>
        {(d) =>
          d.length === 0 ? (
            <p className="redup">Belum ada kerja ulang. (Skenario D)</p>
          ) : (
            d.map((k) => (
              <div key={k.id} className="kartu tumpuk">
                <div className="antara">
                  <strong>{k.kode} · {k.pekerja} · {LABEL_TAHAP[k.tahap]} · {k.pcs} pcs</strong>
                  <span className="kecil redup">karena versi {k.nomorVersi} · {jamTanggal(k.pada)}</span>
                </div>
                <p>{k.alasan}</p>
                {k.keputusan ? (
                  <p className="sukses">{k.keputusan.bayar ? 'Dibayar ke pekerja' : 'Tidak dibayar'} · {k.keputusan.tagihKePembeli ? 'ditagih ke pembeli' : 'tidak ditagih'}</p>
                ) : (
                  <div className="baris">
                    <button className="tombol utama" type="button" disabled={aksi.sedang} onClick={() => aksi.jalankan(`/kerja-ulang/${k.id}/keputusan`, { bayar: true, tagihKePembeli: true }, 'Diputuskan: dibayar, ditagih ke pembeli')}>Bayar & tagih ke pembeli</button>
                    <button className="tombol" type="button" disabled={aksi.sedang} onClick={() => aksi.jalankan(`/kerja-ulang/${k.id}/keputusan`, { bayar: true, tagihKePembeli: false }, 'Diputuskan: dibayar, tidak ditagih')}>Bayar, tidak ditagih</button>
                    <button className="tombol bahaya" type="button" disabled={aksi.sedang} onClick={() => aksi.jalankan(`/kerja-ulang/${k.id}/keputusan`, { bayar: false, tagihKePembeli: false }, 'Diputuskan: tidak dibayar')}>Tidak dibayar</button>
                  </div>
                )}
              </div>
            ))
          )
        }
      </Muat>
    </>
  );
}

function Tarif() {
  const tarif = useData('/tarif');
  const aksi = useAksi();
  const [pilih, setPilih] = useState('');
  const [nilai, setNilai] = useState('');
  const [besok, setBesok] = useState(false);
  const kirim = (e) => {
    e.preventDefault();
    const [modelId, tahap] = pilih.split('|');
    const hariIni = awalHariWib(tarif.data.sekarang);
    aksi.jalankan('/tarif', { modelId, tahap, rupiahPerPcs: bilangan(nilai), berlakuMulai: besok ? hariIni + HARI : hariIni }, 'Tarif baru dicatat');
  };
  return (
    <Muat hasil={tarif}>
      {({ sekarang, daftar: d }) => (
        <div className="kisi-2">
          <div className="kartu" style={{ padding: 0 }}>
            <table>
              <thead><tr><th>Model</th><th>Tahap</th><th className="num">Tarif berlaku</th><th>Riwayat</th></tr></thead>
              <tbody>
                {d.map((t) => (
                  <tr key={`${t.modelId}${t.tahap}`}>
                    <td>{t.model}</td><td>{LABEL_TAHAP[t.tahap]}</td><td className="num">{t.berlaku ? rupiah(t.berlaku) : <span className="redup">belum diatur</span>}</td>
                    <td className="kecil redup">{t.riwayat.length > 1 ? t.riwayat.map((r) => `${rupiah(r.rupiahPerPcs)} sejak ${tanggalPendek(r.berlakuMulai)}`).join(' · ') : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form className="kartu tumpuk" onSubmit={kirim}>
            <h2 style={{ margin: 0 }}>Ubah tarif</h2>
            <Medan label="Model dan tahap">
              <select className="masukan" value={pilih} onChange={(e) => setPilih(e.target.value)} required>
                <option value="">Pilih…</option>
                {d.map((t) => <option key={`${t.modelId}${t.tahap}`} value={`${t.modelId}|${t.tahap}`}>{t.model} · {LABEL_TAHAP[t.tahap]}</option>)}
              </select>
            </Medan>
            <Medan label="Rupiah per pcs"><input className="masukan" inputMode="numeric" value={nilai} onChange={(e) => setNilai(e.target.value)} placeholder="4500" /></Medan>
            <label className="cek"><input type="checkbox" checked={besok} onChange={(e) => setBesok(e.target.checked)} /> Berlaku mulai besok (bukan hari ini)</label>
            <button className="tombol utama" type="submit" disabled={aksi.sedang}>Simpan tarif baru</button>
            <Pesan aksi={aksi} />
            <p className="label">Tarif lama tidak dihapus. Setoran sebelum tanggal berlaku tetap memakai tarif lama. Hari ini: {tanggal(sekarang)}.</p>
          </form>
        </div>
      )}
    </Muat>
  );
}
