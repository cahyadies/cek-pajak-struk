// SidakStruk — Data Edukasi Pajak & Generator Foto Struk Utuh

window.TAX_EDUCATION_DB = {
  PPN: {
    code: 'PPN',
    title: 'PPN (Pajak Pertambahan Nilai)',
    receiver: 'Pemerintah Pusat (DJP Kemenkeu)',
    rateInfo: '11% (atau 12% × DPP Nilai Lain 11/12 = efektif 11%)',
    meaning: 'Pajak konsumsi atas Barang/Jasa Kena Pajak (BKP/JKP) di ritel, minimarket, dan supermarket.',
    whyHidden: 'Harga rak di minimarket umumnya sudah termasuk PPN (Inklusif). Rincian DPP (harga sebelum pajak) dan PPN dicetak kecil di paling bawah struk sebagai bukti pungutan PKP.',
    tip: 'Sembako seperti beras dan telur termasuk Non-BKP (BTKP) sehingga bebas PPN.'
  },
  PB1: {
    code: 'PB1',
    title: 'PB1 / PBJT Makanan & Minuman',
    receiver: 'Pemerintah Daerah Kab/Kota (Bapenda)',
    rateInfo: 'Maksimal 10%',
    meaning: 'Pajak daerah atas konsumsi makanan/minuman di restoran, kafe, warung, maupun takeaway.',
    whyHidden: 'Sering ditambahkan di kasir (Eksklusif) di bawah Subtotal. Menurut UU HKPD, dasar pengenaan PB1 adalah (Subtotal + Service Charge), sehingga Service Charge ikut kena pajak 10%!',
    tip: 'Restoran yang memungut PB1 tidak boleh memungut PPN sekaligus untuk makanan yang sama.'
  },
  SERVICE: {
    code: 'SERVICE',
    title: 'Service Charge (Biaya Layanan)',
    receiver: 'Manajemen & Karyawan Resto/Hotel (Bukan Pajak Negara)',
    rateInfo: 'Umumnya 5% – 10%',
    meaning: 'Biaya layanan yang dipungut tempat usaha untuk dibagikan ke pekerja restoran/hotel, bukan setoran pajak ke pemerintah.',
    whyHidden: 'Dicetak berurutan dengan baris pajak di kaki struk sehingga kerap dikira pajak resmi.',
    tip: 'Walaupun bukan pajak, nominal Service Charge menambah dasar perhitungan PB1 10%.'
  }
};

window.SAMPLE_RECEIPTS = {
  minimarket: {
    label: 'Minimarket (PPN Inklusif)',
    merchant: 'INDOMART PRIMA JAYA',
    sub: 'NPWP 01.308.xxx.x-092.000',
    mode: 'inclusive',
    items: [
      ['BEAR BRAND 189ML x2', 21000],
      ['CHITATO 68G x2', 25000],
      ['SENSODYNE 100G x1', 32400],
      ['ULTRA MILK 1L x1', 21500],
      ['BERAS PREMIUM 5KG (BTKP)', 74500]
    ],
    subtotal: 174400, service: 0, dpp: 90000, btkp: 74500, ppn: 9900, pb1: 0, total: 174400,
    footers: ['HARGA JUAL : 174.400', 'BTKP : 74.500  DPP : 90.000  PPN : 9.900', 'HARGA SUDAH TERMASUK PPN']
  },
  resto: {
    label: 'Resto & Cafe (PB1 + Service)',
    merchant: 'SENJA BISTRO & ROASTERY',
    sub: 'NPWPD 1.20492.01 - JAKARTA',
    mode: 'exclusive',
    items: [
      ['2x WAGYU BEEF BOWL', 136000],
      ['2x ICED AREN LATTE', 64000],
      ['1x TRUFFLE FRIES', 40000]
    ],
    subtotal: 240000, service: 16800, dpp: 256800, btkp: 0, ppn: 0, pb1: 25680, total: 282480,
    footers: ['SUBTOTAL : 240.000', 'SERVICE (7%) : 16.800', 'PB1 (10% x 256.800) : 25.680', 'GRAND TOTAL : 282.480']
  },
  anomali: {
    label: 'Struk Janggal (Pajak Ganda ⚠️)',
    merchant: 'WARUNG KOPI HITS',
    sub: 'TANPA IDENTITAS PAJAK RESMI',
    mode: 'exclusive',
    items: [
      ['2x NASI GORENG SPESIAL', 70000],
      ['2x ES KOPI SUSU', 40000]
    ],
    subtotal: 110000, service: 11000, dpp: 110000, btkp: 0, ppn: 12100, pb1: 11000, total: 144100,
    footers: ['SUBTOTAL : 110.000', 'SERVICE 10% : 11.000', 'PB1 10% : 11.000  +  PPN 11% : 12.100', 'TOTAL BAYAR : 144.100']
  }
};

window.createSamplePhotoCanvas = function (key) {
  const s = window.SAMPLE_RECEIPTS[key] || window.SAMPLE_RECEIPTS.minimarket;
  const c = document.createElement('canvas');
  const W = 480, H = 560;
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const rp = (n) => Number(n || 0).toLocaleString('id-ID');

  // Permukaan meja gelap agar kontras dengan kertas struk
  ctx.fillStyle = '#2B2825';
  ctx.fillRect(0, 0, W, H);

  // Kertas struk utuh di tengah meja
  const px = 48, py = 28, pw = W - 96, ph = H - 56;
  ctx.fillStyle = '#FCF9F2';
  ctx.fillRect(px, py, pw, ph);

  let y = py + 40;
  const L = px + 22, R = px + pw - 22, C = W / 2;
  ctx.fillStyle = '#161514';
  ctx.font = 'bold 16px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(s.merchant, C, y);
  y += 18;
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#57534E';
  ctx.fillText(s.sub, C, y);
  y += 20;

  const dash = () => {
    ctx.strokeStyle = '#C7BFA8';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke();
    ctx.setLineDash([]);
    y += 20;
  };
  dash();

  ctx.font = '12px "IBM Plex Mono", monospace';
  s.items.forEach(([name, price]) => {
    ctx.fillStyle = '#161514';
    ctx.textAlign = 'left'; ctx.fillText(name, L, y);
    ctx.textAlign = 'right'; ctx.fillText(rp(price), R, y);
    y += 24;
  });
  y += 4;
  dash();

  ctx.font = 'bold 14.5px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left'; ctx.fillText('TOTAL BAYAR', L, y);
  ctx.textAlign = 'right'; ctx.fillText('Rp ' + rp(s.total), R, y);
  y += 18;
  dash();

  ctx.font = '10.5px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#44403C';
  ctx.textAlign = 'left';
  s.footers.forEach((line) => {
    ctx.fillText(line, L, y);
    y += 16;
  });

  return { photoCanvas: c, sample: s };
};
