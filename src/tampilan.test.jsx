// @vitest-environment jsdom
// Tes asap: setiap peran bisa dirender dari data contoh, dan alur utama bisa diklik tanpa galat.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App.jsx';

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, '', '/');
});
afterEach(cleanup);

const pil = (nama) => screen.getAllByRole('button', { name: nama }).find((b) => b.classList.contains('pil'));

describe('tampilan demo', () => {
  it('owner → admin → detail order → pekerja → pembeli', async () => {
    render(<App />);
    expect(await screen.findByText('Pak Hendra')).toBeTruthy();
    expect(await screen.findByText(/Budi · ORD-031 · Jahit/)).toBeTruthy();
    expect(screen.getAllByText('Terancam telat').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('tab', { name: 'Upah' }));
    expect(await screen.findByText('Rp 1.062.500')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Kerja ulang' }));
    expect(await screen.findByText(/Belum ada kerja ulang/)).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Tarif per model' }));
    expect(await screen.findByText('Ubah tarif')).toBeTruthy();

    fireEvent.click(pil('Admin'));
    expect(await screen.findByText('Rina')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: 'ORD-031' }));
    expect(await screen.findByText(/Jejak serah terima/)).toBeTruthy();
    expect(screen.getAllByText(/setoran terakhir/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('tab', { name: 'Menunggu konfirmasi' }));
    expect(await screen.findByText(/ORD-033 · Potong · ke Dedi/)).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: '+ Order baru' }));
    expect(await screen.findByRole('button', { name: 'Buat order' })).toBeTruthy();

    fireEvent.click(pil('Dedi'));
    expect(await screen.findByText('Halo, Dedi')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: 'Sesuai, 120 pcs' }));
    expect(await screen.findByText(/Tidak ada serah terima yang perlu dikonfirmasi/)).toBeTruthy();

    const pilihPembeli = screen.getByLabelText('Pembeli');
    const opsi = within(pilihPembeli).getByRole('option', { name: 'ORD-030' });
    fireEvent.change(pilihPembeli, { target: { value: opsi.value } });
    expect(await screen.findByText('MENUNGGU PERSETUJUAN ANDA')).toBeTruthy();
    expect(screen.getAllByText('BERUBAH').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Setujui versi 2' }));
    expect(await screen.findByText('Versi 2 disetujui')).toBeTruthy();
    expect(await screen.findByText(/Pembeli menjawab spesifikasi/)).toBeTruthy(); // panel server
  });

  it('penolakan tampil sebagai pesan dan tercatat di panel server', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Upah' }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Finalkan upah' }))[0]);
    expect(await screen.findByText('Periode ini belum selesai')).toBeTruthy();
    expect(await screen.findByText('→ Ditolak, data tidak berubah')).toBeTruthy();
  });

  it('skenario terpandu memindahkan peran', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Skenario terpandu' }));
    fireEvent.click(await screen.findByRole('button', { name: /D\. Pembeli mengubah spesifikasi/ }));
    expect(await screen.findByText('MENUNGGU PERSETUJUAN ANDA')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    expect(await screen.findByText('Rina')).toBeTruthy();
  });
});
