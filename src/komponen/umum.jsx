// Komponen tampilan kecil yang dipakai di semua halaman.

export function Chip({ peta, nilai }) {
  const [kelas, teks] = peta[nilai] ?? ['wait', nilai ?? '—'];
  return <span className={`chip ${kelas}`}>{teks}</span>;
}

export function Progres({ persen }) {
  const p = Math.max(0, Math.min(100, persen ?? 0));
  return (
    <span className="baris" style={{ gap: 8, flexWrap: 'nowrap' }}>
      <span className="bar" role="img" aria-label={`${p}%`}>
        <div style={{ width: `${p}%` }} />
      </span>
      <span className="kecil">{p}%</span>
    </span>
  );
}

export function Muat({ hasil, children }) {
  if (hasil.memuat && !hasil.data) return <p className="redup">Memuat…</p>;
  if (hasil.galat) return <p className="galat">{hasil.galat}</p>;
  if (!hasil.data) return null;
  return children(hasil.data);
}

export function Pesan({ aksi }) {
  if (aksi.galat) return <p className="galat" role="alert">{aksi.galat}</p>;
  if (aksi.pesan) return <p className="sukses" role="status">{aksi.pesan}</p>;
  return null;
}

export function Medan({ label, children }) {
  return (
    <label className="medan">
      {label}
      {children}
    </label>
  );
}

export function Tab({ pilihan, nilai, ubah }) {
  return (
    <div className="tab" role="tablist">
      {pilihan.map(([kunci, label]) => (
        <button key={kunci} type="button" role="tab" aria-selected={nilai === kunci} onClick={() => ubah(kunci)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** Bilangan dari input; kosong → undefined supaya server yang memvalidasi. */
export const bilangan = (teks) => (String(teks).trim() === '' ? undefined : Number(teks));
