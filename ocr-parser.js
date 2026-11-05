// SidakStruk — Auto-Detect Kertas Struk (Image-to-Document) & OCR Parser

/**
 * Mendeteksi batas kertas struk (area terang/kertas di atas latar belakang)
 * dari kanvas foto utuh, lalu mengembalikan koordinat 4 sudut dokumen.
 */
window.detectPaperBounds = function (canvas) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, W, H).data;

  // Hitung rata-rata kecerahan untuk mencari ambang batas kertas (adaptive threshold)
  let sumLum = 0, count = 0;
  const step = 4;
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const i = (y * W + x) * 4;
      sumLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      count++;
    }
  }
  const avgLum = sumLum / Math.max(1, count);
  const threshold = Math.min(215, Math.max(135, avgLum * 1.08));

  let minX = W, minY = H, maxX = 0, maxY = 0, found = 0;
  for (let y = Math.round(H * 0.03); y < H * 0.97; y += step) {
    for (let x = Math.round(W * 0.03); x < W * 0.97; x += step) {
      const i = (y * W + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum >= threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found++;
      }
    }
  }

  // Fallback jika foto sudah penuh kertas struk
  if (found < 40 || (maxX - minX) < W * 0.25 || (maxY - minY) < H * 0.25) {
    minX = Math.round(W * 0.06);
    minY = Math.round(H * 0.04);
    maxX = Math.round(W * 0.94);
    maxY = Math.round(H * 0.96);
  }

  const pad = 6;
  return {
    x: Math.max(0, minX - pad),
    y: Math.max(0, minY - pad),
    width: Math.min(W, maxX - minX + pad * 2),
    height: Math.min(H, maxY - minY + pad * 2)
  };
};

/**
 * Mengubah gambar foto struk menjadi Dokumen Bersih (Image-to-Document):
 * 1. Deteksi batas kertas struk & gambar garis poligon + 4 titik sudut di rawCanvas
 * 2. Crop seluruh kertas struk ke docCanvas & terapkan filter dokumen bersih
 */
window.scanImageToDocument = function (sourceEl, rawCanvas, docCanvas, highlightRatio) {
  const srcW = sourceEl.naturalWidth || sourceEl.videoWidth || sourceEl.width || 480;
  const srcH = sourceEl.naturalHeight || sourceEl.videoHeight || sourceEl.height || 620;
  const W = 480;
  const H = Math.round((srcH / srcW) * W);

  rawCanvas.width = W;
  rawCanvas.height = H;
  const rCtx = rawCanvas.getContext('2d');
  rCtx.drawImage(sourceEl, 0, 0, W, H);

  // 1. Deteksi batas kertas struk secara otomatis
  const bounds = window.detectPaperBounds(rawCanvas);

  // 2. Crop seluruh kertas struk ke docCanvas (Image-to-Document)
  const docW = 440;
  const docH = Math.max(320, Math.round((bounds.height / bounds.width) * docW));
  docCanvas.width = docW;
  docCanvas.height = docH;
  const dCtx = docCanvas.getContext('2d');
  dCtx.drawImage(rawCanvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, docW, docH);

  // Filter Image-to-Document: bersihkan bayangan kertas & pertajam teks
  const img = dCtx.getImageData(0, 0, docW, docH);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const clean = gray > 175 ? Math.min(252, gray * 1.12) : Math.max(18, (gray - 128) * 1.55 + 115);
    d[i] = clean;
    d[i + 1] = clean * 0.99;
    d[i + 2] = clean * 0.96;
  }
  dCtx.putImageData(img, 0, 0);

  // Tandai area baris pajak pada dokumen struk utuh
  const hy = Math.round(docH * (highlightRatio || 0.72));
  const hh = Math.round(docH * 0.21);
  dCtx.save();
  dCtx.fillStyle = 'rgba(200, 90, 23, 0.12)';
  dCtx.strokeStyle = '#C85A17';
  dCtx.lineWidth = 2;
  dCtx.setLineDash([6, 4]);
  dCtx.fillRect(14, hy, docW - 28, hh);
  dCtx.strokeRect(14, hy, docW - 28, hh);
  dCtx.restore();

  // 3. Gambar bingkai deteksi dokumen (4 sudut) di atas rawCanvas
  rCtx.save();
  rCtx.fillStyle = 'rgba(13, 110, 82, 0.10)';
  rCtx.strokeStyle = '#0D6E52';
  rCtx.lineWidth = 2.5;
  rCtx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  rCtx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

  const corners = [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x + bounds.width, bounds.y + bounds.height],
    [bounds.x, bounds.y + bounds.height]
  ];
  rCtx.fillStyle = '#C85A17';
  corners.forEach(([cx, cy]) => {
    rCtx.beginPath();
    rCtx.arc(cx, cy, 6, 0, Math.PI * 2);
    rCtx.fill();
  });
  rCtx.restore();

  return bounds;
};

function parseNominal(str) {
  if (!str) return 0;
  const matches = str.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,7})/g);
  if (!matches) return 0;
  const val = parseInt(matches[matches.length - 1].replace(/[.,]/g, ''), 10);
  return isNaN(val) ? 0 : val;
}

window.analyzeTaxData = function (data) {
  const total = data.total || data.subtotal || 0;
  const ppn = data.ppn || 0;
  const pb1 = data.pb1 || 0;
  const service = data.service || 0;
  const totalTax = ppn + pb1;
  const totalExtra = totalTax + service;
  const base = data.dpp || (data.mode === 'inclusive' ? Math.max(1, total - totalTax) : (data.subtotal || Math.max(1, total - totalExtra)));

  const taxPctOfTotal = total > 0 ? (totalTax / total) * 100 : 0;
  const extraPctOfTotal = total > 0 ? (totalExtra / total) * 100 : 0;
  const rateOnBase = base > 0 ? (totalTax / base) * 100 : 0;

  const activeTaxes = [];
  if (ppn > 0) activeTaxes.push(window.TAX_EDUCATION_DB.PPN);
  if (pb1 > 0) activeTaxes.push(window.TAX_EDUCATION_DB.PB1);
  if (service > 0) activeTaxes.push(window.TAX_EDUCATION_DB.SERVICE);
  if (activeTaxes.length === 0) activeTaxes.push(window.TAX_EDUCATION_DB.PPN);

  const warnings = [];
  if (ppn > 0 && pb1 > 0) {
    warnings.push('Terdeteksi pungutan ganda (PPN + PB1 sekaligus). Usaha kuliner seharusnya hanya memungut PB1/PBJT Daerah, bukan keduanya.');
  }
  if (pb1 > 0 && service > 0) {
    warnings.push('Perhatikan: PB1 10% dihitung dari (Subtotal + Service Charge), sehingga biaya layanan ikut terkena pajak 10%.');
  }

  return {
    ...data,
    total, ppn, pb1, service, base,
    totalTax, totalExtra,
    taxPctOfTotal: Number(taxPctOfTotal.toFixed(2)),
    extraPctOfTotal: Number(extraPctOfTotal.toFixed(2)),
    rateOnBase: Number(rateOnBase.toFixed(1)),
    activeTaxes,
    warnings
  };
};

window.parseReceiptOcrText = function (rawText) {
  const lines = (rawText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let merchant = lines[0] || 'Struk Belanja';
  let subtotal = 0, dpp = 0, btkp = 0, ppn = 0, pb1 = 0, service = 0, total = 0;
  let inclusive = /SUDAH\s*TERMASUK\s*PPN|HARGA\s*JUAL|BTKP/i.test(rawText);

  for (const line of lines) {
    const u = line.toUpperCase();
    const val = parseNominal(u);
    if (!val) continue;

    if (/\bDPP\b/.test(u) && !/PPN/.test(u)) dpp = val;
    else if (/\bBTKP\b|NON[-\s]?BKP/.test(u)) btkp = val;
    else if (/\bPPN\b|VAT/.test(u)) {
      ppn = val;
      const dppMatch = u.match(/DPP\s*[:=]?\s*(\d{1,3}(?:[.,]\d{3})+)/);
      if (dppMatch) dpp = parseInt(dppMatch[1].replace(/[.,]/g, ''), 10);
    } else if (/\bPB1\b|\bPBJT\b|PAJAK\s*RESTO|\bTAX\b/.test(u)) pb1 = val;
    else if (/SERVICE|LAYANAN|\bSC\b/.test(u)) service = val;
    else if (/SUB\s*TOTAL|HARGA\s*JUAL/.test(u)) subtotal = val;
    else if (/GRAND\s*TOTAL|TOTAL\s*BAYAR|TOTAL\s*BELANJA|^TOTAL\b/.test(u)) {
      if (val >= total) total = val;
    }
  }

  if (!total && subtotal) total = inclusive ? subtotal : subtotal + service + ppn + pb1;
  if (!subtotal && total) subtotal = inclusive ? total : Math.max(0, total - service - ppn - pb1);
  if (!ppn && !pb1 && total > 0) {
    dpp = Math.round((total * 100) / 111);
    ppn = total - dpp;
    inclusive = true;
  }

  return window.analyzeTaxData({
    merchant, subtotal, dpp, btkp, ppn, pb1, service, total,
    mode: inclusive ? 'inclusive' : 'exclusive'
  });
};
