import { PenyediaSesi, useSesi } from './sesi.jsx';
import { BarDemo, PanelServer, PanelSkenario } from './demo/Demo.jsx';
import Owner from './halaman/Owner.jsx';
import Admin from './halaman/Admin.jsx';
import Pekerja from './halaman/Pekerja.jsx';
import Pembeli from './halaman/Pembeli.jsx';

function Isi() {
  const { klien, sesi, galatMuat, panel } = useSesi();
  if (galatMuat) return <p className="galat" style={{ margin: 24 }}>Gagal memuat demo: {galatMuat}</p>;
  if (!klien) return <p className="redup" style={{ margin: 24 }}>Menyiapkan data contoh…</p>;
  return (
    <>
      <BarDemo />
      <div className="tata">
        <main className="isi">
          {sesi.peran === 'OWNER' && <Owner />}
          {sesi.peran === 'ADMIN' && <Admin />}
          {sesi.peran === 'PEKERJA' && <Pekerja key={sesi.penggunaId} />}
          {sesi.peran === 'PEMBELI' && <Pembeli key={sesi.token} token={sesi.token} />}
        </main>
        <aside className="samping" aria-label="Panel demo">
          {panel === 'skenario' && <PanelSkenario />}
          <PanelServer />
        </aside>
      </div>
    </>
  );
}

export default function App() {
  return (
    <PenyediaSesi>
      <Isi />
    </PenyediaSesi>
  );
}
