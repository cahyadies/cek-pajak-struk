// SidakStruk — Controller Utama (Image-to-Document Full Receipt Scanner)

(function () {
  const $ = (id) => document.getElementById(id);
  const rp = (n) => 'Rp ' + Math.round(Number(n || 0)).toLocaleString('id-ID');
  const pct = (n) => Number(n || 0).toFixed(2).replace('.', ',');

  let currentAnalysis = null;
  let cameraStream = null;
  let deferredPrompt = null;

  const docCanvas = $('docCanvas');
  const rawCanvas = $('rawCanvas');
  const docStage = $('docStage');
  const resultSection = $('resultSection');

  function triggerScanSweep() {
    docStage.classList.remove('scanning');
    void docStage.offsetWidth;
    docStage.classList.add('scanning');
    resultSection.classList.add('updating');
    setTimeout(() => resultSection.classList.remove('updating'), 320);
  }

  function renderEduCard(edu) {
    return `
      <article class="edu-item">
        <h3>${edu.title}</h3>
        <div class="edu-meta">Disetor ke: ${edu.receiver} • Tarif: ${edu.rateInfo}</div>
        <p><strong>Apa maksudnya?</strong> ${edu.meaning}</p>
        <p><strong>Kenapa nyempil di bawah?</strong> ${edu.whyHidden}</p>
        <p><strong>💡 Info penting:</strong> ${edu.tip}</p>
      </article>
    `;
  }

  function updateUI(analysis) {
    currentAnalysis = analysis;
    $('resMerchant').textContent = analysis.merchant || 'STRUK BELANJA';
    $('resTaxPct').textContent = pct(analysis.taxPctOfTotal);
    $('modeBadge').textContent = analysis.mode === 'inclusive' ? 'PAJAK INKLUSIF (SUDAH TERMASUK)' : 'PAJAK EKSKLUSIF (+DI KASIR)';

    const total = Math.max(1, analysis.total);
    const gPct = Math.max(0, ((total - analysis.totalExtra) / total) * 100);
    const sPct = (analysis.service / total) * 100;
    const tPct = (analysis.totalTax / total) * 100;

    $('barGoods').style.width = gPct + '%';
    $('barService').style.width = sPct + '%';
    $('barTax').style.width = tPct + '%';

    $('legGoodsPct').textContent = pct(gPct) + '%';
    $('legServicePct').textContent = pct(sPct) + '%';
    $('legTaxPct').textContent = pct(tPct) + '%';
    $('legServiceWrap').classList.toggle('hidden', analysis.service <= 0);

    $('resTotal').textContent = rp(analysis.total);
    $('resBase').textContent = rp(analysis.base);
    $('resBtkp').textContent = rp(analysis.btkp || 0);
    $('rowBtkp').classList.toggle('hidden', !(analysis.btkp > 0));
    $('resService').textContent = rp(analysis.service);
    $('rowService').classList.toggle('hidden', !(analysis.service > 0));
    $('resRateOnBase').textContent = String(analysis.rateOnBase).replace('.', ',') + '%';
    $('resTaxNominal').textContent = `${rp(analysis.totalTax)} (${pct(analysis.taxPctOfTotal)}% dr Total)`;

    const warnBox = $('warningBox');
    if (analysis.warnings && analysis.warnings.length > 0) {
      warnBox.innerHTML = analysis.warnings.map((w) => `<div>⚠️ ${w}</div>`).join('');
      warnBox.classList.remove('hidden');
    } else {
      warnBox.classList.add('hidden');
    }

    $('contextualEduList').innerHTML = analysis.activeTaxes.map(renderEduCard).join('');
  }

  function loadSample(key) {
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.sample === key));
    const { photoCanvas, sample } = window.createSamplePhotoCanvas(key);
    triggerScanSweep();
    window.scanImageToDocument(photoCanvas, rawCanvas, docCanvas, 0.72);
    updateUI(window.analyzeTaxData({
      merchant: sample.merchant,
      subtotal: sample.subtotal,
      dpp: sample.dpp,
      btkp: sample.btkp,
      ppn: sample.ppn,
      pb1: sample.pb1,
      service: sample.service,
      total: sample.total,
      mode: sample.mode
    }));
  }

  async function processImageSource(imgElement) {
    const status = $('ocrStatus');
    status.textContent = 'Mendeteksi tepi kertas struk (Image-to-Document) & membaca seluruh isi struk...';
    status.classList.remove('hidden');

    triggerScanSweep();
    window.scanImageToDocument(imgElement, rawCanvas, docCanvas, 0.70);

    try {
      if (window.Tesseract) {
        const result = await window.Tesseract.recognize(docCanvas, 'ind+eng');
        const parsed = window.parseReceiptOcrText(result.data.text);
        updateUI(parsed);
        status.textContent = 'Dokumen struk selesai dipindai. Klik "Ubah Angka" bila ingin menyesuaikan.';
      } else {
        status.textContent = 'Dokumen struk terdeteksi. Silakan sesuaikan nominal lewat tombol Ubah Angka.';
      }
    } catch (err) {
      status.textContent = 'Kertas struk berhasil dipotong. Gunakan tombol Ubah Angka bila teks struk terlalu pudar.';
    }
  }

  // Event: Upload / Foto Struk Utuh
  $('fileInput').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => processImageSource(img);
    img.src = URL.createObjectURL(file);
  });

  // Event: Kamera Auto-Scan
  $('openCamBtn').addEventListener('click', async () => {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      $('cameraVideo').srcObject = cameraStream;
      $('cameraWrap').classList.remove('hidden');
    } catch (e) {
      $('fileInput').click();
    }
  });

  function stopCamera() {
    if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
    $('cameraWrap').classList.add('hidden');
  }
  $('closeCamBtn').addEventListener('click', stopCamera);
  $('captureBtn').addEventListener('click', () => {
    processImageSource($('cameraVideo'));
    stopCamera();
  });

  // Event: Sample Chips & Toggle Titik Potong Kertas vs Hasil Dokumen
  document.querySelectorAll('.chip').forEach((btn) => {
    btn.addEventListener('click', () => loadSample(btn.dataset.sample));
  });
  $('toggleRawPhotoBtn').addEventListener('click', () => {
    const showingRaw = !rawCanvas.classList.toggle('hidden');
    docCanvas.classList.toggle('hidden', showingRaw);
    $('toggleRawPhotoBtn').textContent = showingRaw ? 'Lihat Dokumen Bersih' : 'Lihat Titik Potong Kertas';
  });

  // Event: Modal Koreksi Angka
  $('editNumbersBtn').addEventListener('click', () => {
    if (!currentAnalysis) return;
    $('edMerchant').value = currentAnalysis.merchant || '';
    $('edTotal').value = currentAnalysis.total || 0;
    $('edBase').value = currentAnalysis.base || 0;
    $('edPpn').value = currentAnalysis.ppn || 0;
    $('edPb1').value = currentAnalysis.pb1 || 0;
    $('edService').value = currentAnalysis.service || 0;
    $('editModal').classList.remove('hidden');
  });
  $('cancelEditBtn').addEventListener('click', () => $('editModal').classList.add('hidden'));
  $('saveEditBtn').addEventListener('click', () => {
    updateUI(window.analyzeTaxData({
      merchant: $('edMerchant').value || 'Struk Manual',
      total: Number($('edTotal').value) || 0,
      dpp: Number($('edBase').value) || 0,
      subtotal: Number($('edBase').value) || 0,
      ppn: Number($('edPpn').value) || 0,
      pb1: Number($('edPb1').value) || 0,
      service: Number($('edService').value) || 0,
      mode: currentAnalysis ? currentAnalysis.mode : 'inclusive'
    }));
    $('editModal').classList.add('hidden');
  });

  // Kalkulator Pajak Interaktif
  function runCalculator() {
    const val = Math.max(0, Number($('calcAmount').value) || 0);
    const scheme = $('calcScheme').value;
    let base = val, service = 0, tax = 0, total = val, label = 'PPN 11%';

    if (scheme === 'ppn_inc') {
      base = Math.round((val * 100) / 111);
      tax = val - base;
      total = val;
    } else if (scheme === 'ppn_exc') {
      tax = Math.round(val * 0.11);
      total = val + tax;
    } else if (scheme === 'resto_pb1') {
      service = Math.round(val * 0.07);
      tax = Math.round((val + service) * 0.10);
      total = val + service + tax;
      label = 'PB1 Resto 10% (dari Makanan + Service)';
    } else if (scheme === 'fastfood_pb1') {
      tax = Math.round(val * 0.10);
      total = val + tax;
      label = 'PBJT Restoran 10%';
    }
    const taxShare = total > 0 ? (tax / total) * 100 : 0;
    $('calcOutput').innerHTML = `
      <div class="ledger-row"><span>Harga Bersih Sebelum Pajak</span><span class="mono">${rp(base)}</span></div>
      ${service > 0 ? `<div class="ledger-row"><span>Service Charge (7%)</span><span class="mono">${rp(service)}</span></div>` : ''}
      <div class="ledger-row highlight-row"><span>${label}</span><strong class="mono tax-amount">${rp(tax)}</strong></div>
      <div class="ledger-row"><span>Total yang Harus Dibayar</span><strong class="mono">${rp(total)}</strong></div>
      <div class="ledger-row"><span>Porsi Pajak dari Total Bayar</span><strong class="mono">${pct(taxShare)}%</strong></div>
    `;
  }
  $('calcAmount').addEventListener('input', runCalculator);
  $('calcScheme').addEventListener('change', runCalculator);

  // Riwayat Pajak (LocalStorage)
  function renderHistory() {
    const list = JSON.parse(localStorage.getItem('sidak_history') || '[]');
    const totalTax = list.reduce((a, b) => a + b.tax, 0);
    const totalSpend = list.reduce((a, b) => a + b.total, 0);
    $('histTotalTax').textContent = rp(totalTax);
    $('histTotalSpend').textContent = rp(totalSpend);
    $('historyList').innerHTML = list.length === 0
      ? '<p class="helper-text">Belum ada struk yang disimpan.</p>'
      : list.map((item) => `
        <div class="hist-item">
          <div><strong>${item.merchant}</strong><br/><small>${item.date} • Pajak ${pct(item.pct)}% dr total</small></div>
          <div class="mono tax-amount">${rp(item.tax)}</div>
        </div>
      `).join('');
  }

  $('saveHistoryBtn').addEventListener('click', () => {
    if (!currentAnalysis) return;
    const list = JSON.parse(localStorage.getItem('sidak_history') || '[]');
    list.unshift({
      merchant: currentAnalysis.merchant,
      tax: currentAnalysis.totalTax,
      total: currentAnalysis.total,
      pct: currentAnalysis.taxPctOfTotal,
      date: new Date().toLocaleDateString('id-ID')
    });
    localStorage.setItem('sidak_history', JSON.stringify(list.slice(0, 30)));
    renderHistory();
    $('saveHistoryBtn').textContent = '✓ Tersimpan di Riwayat';
    setTimeout(() => { $('saveHistoryBtn').textContent = '+ Simpan ke Catatan Pajakku'; }, 1500);
  });

  $('clearHistoryBtn').addEventListener('click', () => {
    localStorage.removeItem('sidak_history');
    renderHistory();
  });

  // Navigasi Bawah
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
      btn.classList.add('active');
      $(btn.dataset.target).classList.add('active');
    });
  });

  // Inisialisasi
  $('fullEduContainer').innerHTML = Object.values(window.TAX_EDUCATION_DB).map(renderEduCard).join('');
  loadSample('minimarket');
  runCalculator();
  renderHistory();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $('installBtn').classList.remove('hidden');
  });
  $('installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt = null;
    $('installBtn').classList.add('hidden');
  });
})();
