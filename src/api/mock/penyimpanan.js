// Tempat mock menyimpan seluruh data. Antarmuka: { baca(): string|null, tulis(teks), hapus() }

export function penyimpananMemori() {
  let isi = null;
  return {
    baca: () => isi,
    tulis: (t) => {
      isi = t;
    },
    hapus: () => {
      isi = null;
    },
  };
}

/** localStorage bisa melempar (mode privat, kuota penuh): demo tetap jalan di memori. */
export function penyimpananLokal(kunci) {
  if (typeof kunci !== 'string' || kunci.length === 0) throw new TypeError('Kunci penyimpanan wajib');
  const cadangan = penyimpananMemori();
  return {
    baca() {
      try {
        return globalThis.localStorage?.getItem(kunci) ?? cadangan.baca();
      } catch {
        return cadangan.baca();
      }
    },
    tulis(teks) {
      cadangan.tulis(teks);
      try {
        globalThis.localStorage?.setItem(kunci, teks);
      } catch {
        /* penuh / diblokir */
      }
    },
    hapus() {
      cadangan.hapus();
      try {
        globalThis.localStorage?.removeItem(kunci);
      } catch {
        /* abaikan */
      }
    },
  };
}
