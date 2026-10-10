/* EDY ERP — Settings */
window.PAGE = {
  init: async function () {
    const box = document.getElementById('pageContent');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const val = (id) => (document.getElementById(id) || {}).value || '';

    box.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

    // layout.js already loaded these before rendering, but this page can also be
    // opened directly, so make sure we have them.
    let S = {};
    try {
      S = Object.assign({}, EDY.settings, await EDY.api.get('/api/settings'));
      Object.assign(EDY.settings, S);
    } catch (e) {
      S = Object.assign({}, EDY.settings);
    }

    const MAX = Number(S.maxScale ?? 6);

    /** Builds <option>s from the list the server sent, marking the current one. */
    function opts(list, current, labels) {
      return (list || []).map((v, i) =>
        '<option value="' + esc(v) + '"' + (String(v) === String(current) ? ' selected' : '') + '>' +
        esc(labels && labels[i] ? labels[i] : v) + '</option>').join('');
    }

    const SCALE_HINT = {
      0: 'Whole units only',
      1: 'Whole and tenths',
      2: 'Most currencies (USD, EUR, SAR, AED)',
      3: 'Oman \u2014 rial and baisa',
      4: 'High precision unit pricing',
      5: 'Very high precision',
      6: 'Maximum \u2014 matches the database'
    };
    const scaleOptions = opts(Array.from({ length: MAX + 1 }, (_, i) => i), S['money.scale']);
    const qtyScaleOptions = opts(Array.from({ length: MAX + 1 }, (_, i) => i), S['qty.scale']);

    // The invoice design presets. Keep the order in step with the server's
    // INVOICE_FORMATS list: the labels here are the names, the ids are the contract.
    const FORMAT_LABELS = ['Classic (current layout)', 'Modern', 'Minimal', 'Bold lines',
      'Elegant', 'Corporate', 'Vivid color', 'Warm color', 'Compact', 'Blueprint'];
    const INV_FORMATS = (S.invoiceFormats || ['classic']).map(String);
    const invFormatOptions = opts(INV_FORMATS, S['biz.invoiceFormat'] || 'classic',
      INV_FORMATS.map((id, i) => FORMAT_LABELS[i] || id));
    const INV_LANGS = (S.invoiceLangs || ['en', 'ar', 'both']).map(String);
    const invLangOptions = opts(INV_LANGS, S['biz.invoiceLang'] || 'en',
      ['English only', '\u0627\u0644\u0639\u0631\u0628\u064a\u0629 (Arabic) only', 'English + \u0627\u0644\u0639\u0631\u0628\u064a\u0629']);

    // Tax rate is stored as a fraction. The rate drop-down offers the common rates
    // the server lists and appends whatever is already stored, so a rate set
    // elsewhere is never silently snapped to a different one on save.
    const vatRate = String(S['tax.vatRate'] ?? 0.05);
    const taxMode = S['tax.mode'] === 'NONE' ? 'NONE' : 'STANDARD';
    const rateList = (S.taxRates || ['0.05']).map(String);
    if (!rateList.includes(vatRate)) rateList.push(vatRate);
    const taxRateOptions = rateList.map(v =>
      '<option value="' + esc(v) + '"' + (v === vatRate ? ' selected' : '') + '>' +
      esc((Number(v) * 100).toLocaleString('en-US', { maximumFractionDigits: 4 })) +
      '%</option>').join('');

    // Only an Administrator may change company-wide settings - PUT /api/settings is
    // restricted server side and answers 403 otherwise. Reflect that here instead of
    // letting someone fill the whole form in and only fail when they press Save.
    // "Change Password" stays open to everyone, since that one is per-user.
    const isAdmin = !!(EDY.me && EDY.me.role === 'Administrator');

    // A super admin looking at every business at once has no single business to write
    // settings to, so the server refuses PUT /api/settings (403). Rendering a working
    // "Update Settings" button in that state meant every press - and every logo
    // upload - failed with an error the page could not explain. Say so up front.
    const spansAll = !!(EDY.tenant && EDY.tenant.spansAll && EDY.tenant.spansAll());
    const canSave = isAdmin;

    // Saving always lands on exactly one business. While a super admin is looking at
    // every business at once, that is their own - so name it, rather than letting
    // "Update Settings" quietly write to a company the page never identified.
    const forWhichBiz = spansAll
      ? '<div class="alert alert-info py-2 px-3 fs-12 mb-3 d-flex align-items-center gap-2">' +
        '<i class="bi bi-buildings"></i><span>You are looking at all businesses at once, so these are ' +
        'the settings for <strong>' + esc(S['biz.name'] || 'your own business') + '</strong>. ' +
        '<a href="/super-admin">Open another business</a> to change its settings instead.</span></div>'
      : '';
    const ADMIN_FIELDS = ['sCurrency', 'sScale', 'sQtyScale', 'sPlacement',
                          'sTaxMode', 'sTaxRate', 'sTaxBasis',
                          'sBizName', 'sBizAddr', 'sBizPhone', 'sBizVat',
                          'sCompanyName', 'sNameLocal', 'sLogo', 'sStartDate',
                          'sCode1Name', 'sCode2Name', 'sCode1', 'sCode2',
                          'sEditDays', 'sProfit', 'sStock', 'sTimezone',
                          'sDateFmt', 'sTimeFmt', 'sFyMonth',
                          'sRcptHead', 'sRcptFoot',
                          'sInvFormat', 'sInvLang', 'sInvFoot'];

    const logo = S['biz.logo'] || '';

    // The preview lives in a container of its own so it can be replaced whether or not
    // a logo is already saved. Previously it was written into the markup only when a
    // logo existed, so the very first upload on a business showed no preview at all
    // and looked like it had not worked.
    function logoSlotHtml(dataUrl, saved) {
      if (!dataUrl) {
        return '<div class="form-text mb-0">No logo uploaded yet. PNG or JPG, up to 200&nbsp;KB.</div>';
      }
      return '<img src="' + esc(dataUrl) + '" alt="Logo preview" class="img-thumbnail" ' +
        'style="max-height:64px;max-width:180px">' +
        '<div class="form-text mb-0">' + (saved
          ? 'Your saved logo will be replaced when you choose a new file.'
          : 'Preview only. Press Update Settings to save this logo.') + '</div>';
    }
    const logoPreview = '<div id="logoSlot">' + logoSlotHtml(logo, true) + '</div>';

    box.innerHTML =
      '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">' +
      '<div><h1 class="page-title mb-1">Settings</h1><div class="page-sub">Business details, money and tax rules, regional formats and receipt layout</div></div>' +
      '</div>' +

      forWhichBiz +

      '<div class="row g-4">' +
      '<div class="col-12 col-lg-6">' +

      /* ---------------- Business ---------------- */
      '<div class="card mb-4"><div class="card-header"><i class="bi bi-building me-2 text-primary"></i>Business</div><div class="card-body">' +
      '<div class="mb-3"><label class="form-label" for="sBizName">Business Name</label>' +
      '<input class="form-control" id="sBizName" value="' + esc(S['biz.name'] ?? '') + '">' +
      '<div class="form-text">Shown in the sidebar and on screen.</div></div>' +

      '<div class="mb-3"><label class="form-label" for="sCompanyName">Company Name</label>' +
      '<input class="form-control" id="sCompanyName" value="' + esc(S['biz.companyName'] ?? '') + '"></div>' +

      '<div class="mb-3"><label class="form-label" for="sNameLocal">Company Name (in local language)</label>' +
      '<input class="form-control" id="sNameLocal" dir="rtl" value="' + esc(S['biz.nameLocal'] ?? '') + '"></div>' +

      '<div class="row g-3 mb-3">' +
      '<div class="col-6"><label class="form-label" for="sCode1Name">Code 1 name</label>' +
      '<input class="form-control" id="sCode1Name" placeholder="e.g. CR Number" value="' + esc(S['biz.code1Name'] ?? '') + '"></div>' +
      '<div class="col-6"><label class="form-label" for="sCode1">Code 1</label>' +
      '<input class="form-control" id="sCode1" value="' + esc(S['biz.code1'] ?? '') + '"></div>' +
      '</div>' +
      '<div class="row g-3 mb-3">' +
      '<div class="col-6"><label class="form-label" for="sCode2Name">Code 2 name</label>' +
      '<input class="form-control" id="sCode2Name" placeholder="e.g. Tax Number" value="' + esc(S['biz.code2Name'] ?? '') + '"></div>' +
      '<div class="col-6"><label class="form-label" for="sCode2">Code 2</label>' +
      '<input class="form-control" id="sCode2" value="' + esc(S['biz.code2'] ?? '') + '"></div>' +
      '</div>' +
      '<div class="form-text">Name the two codes yourself \u2014 they print on invoices and receipts under the label you give them.</div>' +
      '</div></div>' +

      '<div class="card mb-4"><div class="card-header"><i class="bi bi-card-image me-2 text-primary"></i>Logo</div><div class="card-body">' +
      '<div class="d-flex align-items-center gap-3 flex-wrap">' + logoPreview +
      '<div><label class="btn btn-outline-primary btn-sm mb-0" for="sLogo"><i class="bi bi-upload me-1"></i>Browse</label>' +
      '<input type="file" id="sLogo" accept="image/png,image/jpeg" class="d-none">' +
      '<button type="button" class="btn btn-outline-danger btn-sm mb-0 ms-1" id="btnClearLogo"><i class="bi bi-x-lg"></i></button></div>' +
      '</div><div class="form-text mt-2">Stored inside the database, so no separate file is kept on the server.</div>' +
      '</div></div>' +

      '<div class="card"><div class="card-header"><i class="bi bi-geo-alt me-2 text-primary"></i>Business Profile</div><div class="card-body">' +
      '<div class="mb-3"><label class="form-label" for="sBizAddr">Address</label><input class="form-control" id="sBizAddr" value="' + esc(S['biz.address'] ?? '') + '"></div>' +
      '<div class="row g-3"><div class="col-6"><label class="form-label" for="sBizPhone">Phone</label><input class="form-control" id="sBizPhone" value="' + esc(S['biz.phone'] ?? '') + '"></div>' +
      '<div class="col-6"><label class="form-label" for="sBizVat">VAT Registration No.</label><input class="form-control" id="sBizVat" value="' + esc(S['biz.vatNo'] ?? '') + '"></div></div>' +
      '<div class="mt-3"><label class="form-label" for="sStartDate">Start Date</label>' +
      '<input class="form-control" id="sStartDate" type="date" value="' + esc(S['biz.startDate'] ?? '') + '">' +
      '<div class="form-text">Reports and dashboards will not look earlier than this date.</div></div>' +
      '<div class="form-text">Printed on receipts and invoices.</div>' +
      '</div></div>' +
      '</div>' +

      '<div class="col-12 col-lg-6">' +

      /* ---------------- Money & Tax ---------------- */
      '<div class="card mb-4"><div class="card-header"><i class="bi bi-cash-stack me-2 text-primary"></i>Money &amp; Tax</div><div class="card-body">' +
      '<div class="row g-3 mb-3">' +
      '<div class="col-6"><label class="form-label" for="sCurrency">Currency</label>' +
      '<select class="form-select" id="sCurrency">' + opts(S.currencies, S['money.currency']) + '</select></div>' +
      '<div class="col-6"><label class="form-label" for="sScale">Currency precision</label>' +
      '<select class="form-select" id="sScale">' + scaleOptions + '</select>' +
      '<div class="form-text">' + esc(SCALE_HINT[Number(S['money.scale'])] || '') + '</div></div>' +
      '</div>' +
      '<div class="row g-3 mb-3">' +
      '<div class="col-6"><label class="form-label" for="sQtyScale">Quantity precision</label>' +
      '<select class="form-select" id="sQtyScale">' + qtyScaleOptions + '</select>' +
      '<div class="form-text">How many decimals stock quantities show.</div></div>' +
      '<div class="col-6"><label class="form-label" for="sPlacement">Currency Symbol Placement</label>' +
      '<select class="form-select" id="sPlacement">' +
      opts(S.symbolPlacements, S['money.symbolPlacement'], ['Before amount', 'After amount']) + '</select></div>' +
      '</div>' +
      '<div class="row g-3 mb-2">' +
      '<div class="col-6"><label class="form-label" for="sTaxMode">Tax</label>' +
      '<select class="form-select" id="sTaxMode">' +
      opts(S.taxModes || ['NONE', 'STANDARD'], taxMode, ['None', '5% (Oman standard rate)']) + '</select>' +
      '<div class="form-text">Choosing None charges no tax at all on new documents.</div></div>' +
      '<div class="col-6" id="sRateCol"><label class="form-label" for="sTaxRate">Tax rate</label>' +
      '<select class="form-select" id="sTaxRate">' + taxRateOptions + '</select>' +
      '<div class="form-text">Applies to every new sales invoice, purchase and quotation.</div></div>' +
      '</div>' +
      '<div class="mb-2"><label class="form-label" for="sTaxBasis">Prices are</label>' +
      '<select class="form-select" id="sTaxBasis">' +
      opts(['EXCLUSIVE', 'INCLUSIVE'], S['tax.inclusive'] ? 'INCLUSIVE' : 'EXCLUSIVE',
           ['Tax exclusive \u2014 tax is added on top', 'Tax inclusive \u2014 tax is already inside the price']) +
      '</select>' +
      '<div class="form-text" id="sTaxBasisHint"></div></div>' +
      '<div class="alert alert-light border fs-12 mb-0" id="sTaxPreview"></div>' +
      '<hr class="my-3">' +
      '<div class="d-flex align-items-center gap-2 text-muted fs-12"><i class="bi bi-info-circle"></i><span id="sScalePreview"></span></div>' +
      '</div></div>' +

      /* ---------------- Regional & Time ---------------- */
      '<div class="card mb-4"><div class="card-header"><i class="bi bi-globe2 me-2 text-primary"></i>Regional &amp; Time</div><div class="card-body">' +
      '<div class="row g-3">' +
      '<div class="col-6"><label class="form-label" for="sTimezone">Time zone</label>' +
      '<select class="form-select" id="sTimezone">' + opts(S.timezones, S['biz.timezone']) + '</select>' +
      '<div class="form-text">All dates and times are shown in this zone.</div></div>' +
      '<div class="col-6"><label class="form-label" for="sDateFmt">Date Format</label>' +
      '<select class="form-select" id="sDateFmt">' + opts(S.dateFormats, S['biz.dateFormat']) + '</select></div>' +
      '</div>' +
      '<div class="row g-3 mt-0">' +
      '<div class="col-6"><label class="form-label" for="sTimeFmt">Time Format</label>' +
      '<select class="form-select" id="sTimeFmt">' + opts(S.timeFormats, S['biz.timeFormat'], ['24 Hour', '12 Hour']) + '</select></div>' +
      '<div class="col-6"><label class="form-label" for="sFyMonth">Financial year start month</label>' +
      '<select class="form-select" id="sFyMonth">' +
      opts(Array.from({ length: 12 }, (_, i) => i + 1), S['biz.fyStartMonth'], S.months) + '</select></div>' +
      '</div>' +
      '<div class="d-flex align-items-center gap-2 text-muted fs-12 mt-3"><i class="bi bi-info-circle"></i><span id="sDatePreview"></span></div>' +
      '</div></div>' +

      /* ---------------- Operations ---------------- */
      '<div class="card mb-4"><div class="card-header"><i class="bi bi-sliders me-2 text-primary"></i>Operations</div><div class="card-body">' +
      '<div class="row g-3">' +
      '<div class="col-6"><label class="form-label" for="sEditDays">Transaction Edit Days</label>' +
      '<input class="form-control" id="sEditDays" type="number" min="0" max="3650" value="' + esc(S['biz.editDays'] ?? 30) + '">' +
      '<div class="form-text">0 means a sale can never be edited once saved.</div></div>' +
      '<div class="col-6"><label class="form-label" for="sProfit">Default profit percent</label>' +
      '<input class="form-control" id="sProfit" type="number" min="0" max="100" step="0.001" value="' + esc(S['biz.defaultProfit'] ?? 0) + '">' +
      '<div class="form-text">Pre-filled on new products; you can still change it per product.</div></div>' +
      '</div>' +
      '<div class="mt-3"><label class="form-label" for="sStock">Stock Accounting Method</label>' +
      '<select class="form-select" id="sStock">' +
      opts(S.stockMethods, S['inventory.method'], ['FIFO (First In First Out)', 'LIFO (Last In First Out)', 'Weighted Average']) + '</select>' +
      '<div class="form-text">How stock is costed when a movement does not carry its own cost.</div></div>' +
      '</div></div>' +

      '<div class="card mb-4"><div class="card-header"><i class="bi bi-receipt me-2 text-primary"></i>Receipt Layout</div><div class="card-body">' +
      '<div class="mb-3"><label class="form-label" for="sRcptHead">Receipt Header</label><input class="form-control" id="sRcptHead" value="' + esc(S['receipt.header'] ?? '') + '"></div>' +
      '<div class="mb-0"><label class="form-label" for="sRcptFoot">Receipt Footer</label><textarea class="form-control" id="sRcptFoot" rows="2">' + esc(S['receipt.footer'] ?? '') + '</textarea></div>' +
      '</div></div>' +

      '<div class="card mb-4"><div class="card-header"><i class="bi bi-file-earmark-text me-2 text-primary"></i>Invoice &amp; Design</div><div class="card-body">' +
      '<div class="mb-3"><label class="form-label" for="sInvFormat">Invoice Format</label>' +
      '<select class="form-select" id="sInvFormat">' + invFormatOptions + '</select>' +
      '<div class="form-text">The printed look of every sales invoice, purchase invoice and quotation. One of ten design presets \u2014 the paper size (A4 or 80mm receipt) is chosen at print time and does not change with the design.</div></div>' +
      '<div class="mb-3"><label class="form-label" for="sInvLang">Invoice Language</label>' +
      '<select class="form-select" id="sInvLang">' + invLangOptions + '</select>' +
      '<div class="form-text">The language of the labels on the printed document \u2014 English, Arabic, or both together. Your company name in Arabic is taken from the "Company Name (in local language)" field above; leave it empty and the English name is used.</div></div>' +
      '<div class="mb-0"><label class="form-label" for="sInvFoot">Invoice Footer</label>' +
      '<input class="form-control" id="sInvFoot" value="' + esc(S['invoice.footer'] ?? '') + '" placeholder="e.g. Thank you for your business">' +
      '<div class="form-text">A single line printed beneath every invoice and quotation.</div></div>' +
      '</div></div>' +

      '<div class="card mb-4"><div class="card-header"><i class="bi bi-translate me-2 text-primary"></i>Language</div><div class="card-body">' +
      '<label class="form-label" for="sLang">Display Language</label>' +
      '<select class="form-select" id="sLang"><option value="en"' + (EDY.i18n && EDY.i18n.isArabic() ? '' : ' selected') + '>English</option>' +
      '<option value="ar"' + (EDY.i18n && EDY.i18n.isArabic() ? ' selected' : '') + '>\u0627\u0644\u0639\u0631\u0628\u064a\u0629 (Arabic)</option></select>' +
      '<div class="form-text">Applies to this browser only.</div>' +
      '</div></div>' +

      '<div class="card"><div class="card-header"><i class="bi bi-shield-lock me-2 text-primary"></i>Security</div><div class="card-body">' +
      '<div class="mb-3"><label class="form-label">Change Password</label><div class="row g-2"><div class="col"><input class="form-control" type="password" id="sOldPass" placeholder="Current password" autocomplete="current-password"></div>' +
      '<div class="col"><input class="form-control" type="password" id="sNewPass" placeholder="New password" autocomplete="new-password"></div></div></div>' +
      '<button class="btn btn-primary" id="btnChgPass">Update Password</button>' +
      '</div></div>' +
      '</div>' +
      '</div>' +

      '<div class="card mt-4"><div class="card-header"><i class="bi bi-info-circle me-2 text-primary"></i>About these settings</div><div class="card-body fs-12 muted">' +
      '<p class="mb-2">Every value on this page is stored in the database and applies to all users, on every screen.</p>' +
      '<p class="mb-0">Decimal places can be set from 0 to ' + MAX + '. Money columns are stored with 6 decimal places, so anything above ' + MAX + ' could not be saved.</p>' +
      '</div></div>' +

      '<div class="d-flex justify-content-end mt-4 mb-4">' +
      (canSave
        ? '<button class="btn btn-primary btn-lg px-5" id="btnSave"><i class="bi bi-check-lg me-1"></i>Update Settings</button>'
        : '<div class="alert alert-warning mb-0 py-2 px-3 fs-12"><i class="bi bi-lock me-1"></i>Only an Administrator can change these settings. You are signed in as <strong>' +
          esc(EDY.me && EDY.me.role ? EDY.me.role : 'a restricted user') + '</strong>.</div>') +
      '</div>';

    if (!canSave) {
      ADMIN_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = true;
      });
      const browse = document.querySelector('label[for="sLogo"]');
      if (browse) browse.classList.add('disabled');
    }

    // ---- logo picking ----
    const logoInput = document.getElementById('sLogo');
    const MAX_LOGO_BYTES = 200 * 1024;
    let pendingLogo = logo;                 // unchanged until a new file is chosen

    logoInput.addEventListener('change', () => {
      const file = logoInput.files && logoInput.files[0];
      if (!file) return;
      if (file.size > MAX_LOGO_BYTES) {
        EDY.ui.toast('Logo must be ' + Math.round(MAX_LOGO_BYTES / 1024) + ' KB or smaller', 'warning');
        logoInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        pendingLogo = String(reader.result || '');
        const slot = document.getElementById('logoSlot');
        if (slot) slot.innerHTML = logoSlotHtml(pendingLogo, false);
      };
      reader.onerror = () => {
        logoInput.value = '';
        EDY.ui.toast('That file could not be read. Try a different image.', 'warning');
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('btnClearLogo').addEventListener('click', () => {
      pendingLogo = '';
      logoInput.value = '';
      const slot = document.getElementById('logoSlot');
      if (slot) slot.innerHTML = logoSlotHtml('', false);
      EDY.ui.toast('Logo will be removed when you press Update Settings');
    });

    // ---- live previews ----
    function refreshPreview() {
      const d = Number(document.getElementById('sScale').value);
      const cur = document.getElementById('sCurrency').value;
      const place = document.getElementById('sPlacement').value;
      const n = (1234.5).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
      const el = document.getElementById('sScalePreview');
      if (el) el.textContent = 'Preview: ' + (place === 'AFTER' ? n + ' ' + cur : cur + ' ' + n) +
        '   \u00b7   ' + (SCALE_HINT[d] || '');
    }
    ['sScale', 'sCurrency', 'sPlacement'].forEach(id =>
      document.getElementById(id).addEventListener('change', refreshPreview));
    refreshPreview();

    function refreshDatePreview() {
      const el = document.getElementById('sDatePreview');
      if (!el) return;
      const tz = document.getElementById('sTimezone').value;
      const df = document.getElementById('sDateFmt').value;
      const h12 = document.getElementById('sTimeFmt').value === '12';
      const sample = new Date('2026-09-28T06:45:00Z');   // a fixed instant, so the preview is stable
      const prev = Object.assign({}, EDY.settings, {
        'biz.timezone': tz, 'biz.dateFormat': df, 'biz.timeFormat': h12 ? '12' : '24'
      });
      const saved = EDY.settings;
      EDY.settings = prev;
      const text = EDY.fmt.datetime(sample);
      EDY.settings = saved;
      el.textContent = 'Preview: ' + text;
    }
    ['sTimezone', 'sDateFmt', 'sTimeFmt'].forEach(id =>
      document.getElementById(id).addEventListener('change', refreshDatePreview));
    refreshDatePreview();

    /* ---- tax card: keep the form honest about what will actually be charged ----
       The rate field is pointless while the drop-down says None, so it is hidden
       rather than left on screen looking like it still does something. The preview
       works a fixed 100.000 example through the same maths the server uses, so a
       wrong setting here is visible before saving instead of after. */
    const TAX_EXAMPLE = 100;
    function refreshTaxPreview() {
      const mode = document.getElementById('sTaxMode').value;
      const rate = Number(document.getElementById('sTaxRate').value);
      const inclusive = document.getElementById('sTaxBasis').value === 'INCLUSIVE';
      const rateCol = document.getElementById('sRateCol');
      const basisWrap = document.getElementById('sTaxBasis').closest('.mb-2');

      rateCol.style.display = mode === 'NONE' ? 'none' : '';
      basisWrap.style.display = mode === 'NONE' ? 'none' : '';

      document.getElementById('sTaxBasisHint').textContent = inclusive
        ? 'Enter prices as the customer pays them. Tax is taken back out of them for reporting, so the total never changes.'
        : 'Tax is added on top of the entered prices, so the customer pays more than the price shown.';

      const prev = document.getElementById('sTaxPreview');
      if (mode === 'NONE') {
        prev.innerHTML = '<strong>Example:</strong> a ' + EDY.fmt.money(TAX_EXAMPLE) +
          ' line stays ' + EDY.fmt.money(TAX_EXAMPLE) + '. No tax line appears on any document.';
        return;
      }
      const tax = inclusive ? TAX_EXAMPLE - (TAX_EXAMPLE / (1 + rate)) : TAX_EXAMPLE * rate;
      prev.innerHTML = inclusive
        ? '<strong>Example:</strong> a ' + EDY.fmt.money(TAX_EXAMPLE) + ' line stays ' +
          EDY.fmt.money(TAX_EXAMPLE) + ' on the invoice. Of that, ' + EDY.fmt.money(tax) +
          ' is tax included in the price and ' + EDY.fmt.money(TAX_EXAMPLE - tax) + ' is net.'
        : '<strong>Example:</strong> a ' + EDY.fmt.money(TAX_EXAMPLE) + ' line adds ' +
          EDY.fmt.money(tax) + ' tax on top, so the invoice totals ' +
          EDY.fmt.money(TAX_EXAMPLE + tax) + '.';
    }
    ['sTaxMode', 'sTaxRate', 'sTaxBasis'].forEach(id =>
      document.getElementById(id).addEventListener('change', refreshTaxPreview));
    refreshTaxPreview();

    // ---- save ----
    if (canSave) document.getElementById('btnSave').addEventListener('click', async () => {
      const scale = Number(document.getElementById('sScale').value);
      if (!Number.isInteger(scale) || scale < 0 || scale > MAX) {
        EDY.ui.toast('Decimal places must be between 0 and ' + MAX, 'warning');
        return;
      }
      const qty = Number(document.getElementById('sQtyScale').value);
      if (!Number.isInteger(qty) || qty < 0 || qty > MAX) {
        EDY.ui.toast('Quantity precision must be between 0 and ' + MAX, 'warning');
        return;
      }
      const taxMode = document.getElementById('sTaxMode').value;
      const vat = Number(document.getElementById('sTaxRate').value);
      if (taxMode !== 'NONE' && (!Number.isFinite(vat) || vat < 0 || vat > 1)) {
        EDY.ui.toast('Tax rate must be a fraction between 0 and 1', 'warning');
        return;
      }
      const editDays = Number(document.getElementById('sEditDays').value);
      if (!Number.isInteger(editDays) || editDays < 0 || editDays > 3650) {
        EDY.ui.toast('Transaction edit days must be between 0 and 3650', 'warning');
        return;
      }
      const profit = Number(document.getElementById('sProfit').value);
      if (!Number.isFinite(profit) || profit < 0 || profit > 100) {
        EDY.ui.toast('Default profit percent must be between 0 and 100', 'warning');
        return;
      }

      const lang = document.getElementById('sLang').value;
      const body = {
        'money.scale': scale,
        'money.currency': document.getElementById('sCurrency').value,
        'money.symbolPlacement': document.getElementById('sPlacement').value,
        'qty.scale': qty,
        'tax.vatRate': String(vat),
        'tax.mode': taxMode,
        'tax.inclusive': document.getElementById('sTaxBasis').value === 'INCLUSIVE',
        'biz.name': document.getElementById('sBizName').value.trim(),
        'biz.companyName': document.getElementById('sCompanyName').value.trim(),
        'biz.nameLocal': document.getElementById('sNameLocal').value.trim(),
        'biz.logo': pendingLogo,
        'biz.address': document.getElementById('sBizAddr').value.trim(),
        'biz.phone': document.getElementById('sBizPhone').value.trim(),
        'biz.vatNo': document.getElementById('sBizVat').value.trim(),
        'biz.startDate': document.getElementById('sStartDate').value,
        'biz.code1Name': document.getElementById('sCode1Name').value.trim(),
        'biz.code2Name': document.getElementById('sCode2Name').value.trim(),
        'biz.code1': document.getElementById('sCode1').value.trim(),
        'biz.code2': document.getElementById('sCode2').value.trim(),
        'biz.editDays': editDays,
        'biz.defaultProfit': String(profit),
        'biz.timezone': document.getElementById('sTimezone').value,
        'biz.dateFormat': document.getElementById('sDateFmt').value,
        'biz.timeFormat': document.getElementById('sTimeFmt').value,
        'biz.fyStartMonth': document.getElementById('sFyMonth').value,
        'inventory.method': document.getElementById('sStock').value,
        'receipt.header': document.getElementById('sRcptHead').value.trim(),
        'receipt.footer': document.getElementById('sRcptFoot').value.trim(),
        'biz.invoiceFormat': document.getElementById('sInvFormat').value,
        'biz.invoiceLang': document.getElementById('sInvLang').value,
        'invoice.footer': document.getElementById('sInvFoot').value.trim(),
        'app.language': lang
      };

      const btn = document.getElementById('btnSave');
      btn.disabled = true;
      try {
        const saved = await EDY.api.put('/api/settings', body);
        // The server clamps and defaults, so adopt exactly what it stored.
        Object.assign(EDY.settings, saved);
        if (EDY.i18n) EDY.i18n.setLang(lang);
        // A value the server refused is not stored. Say which, rather than
        // reporting a save that quietly did not happen.
        const rejected = Array.isArray(saved.rejected) ? saved.rejected : [];
        if (rejected.length) {
          EDY.ui.toast('Saved, but the server rejected: ' + rejected.join(', ') +
            '. Those kept their previous values.', 'warning');
        } else {
          EDY.ui.toast('Settings saved');
        }
        PAGE.init();
      } catch (e) {
        btn.disabled = false;
        EDY.ui.toast(e.message || 'Could not save settings', 'error');
      }
    });

    document.getElementById('btnChgPass').addEventListener('click', async () => {
      const oldPass = val('sOldPass');
      const newPass = val('sNewPass');
      if (!oldPass || !newPass) { EDY.ui.toast('Enter both current and new password', 'warning'); return; }
      if (newPass.length < 4) { EDY.ui.toast('Password must be at least 4 characters', 'warning'); return; }
      try {
        await EDY.api.post('/api/auth/change-password', { oldPassword: oldPass, newPassword: newPass });
        document.getElementById('sOldPass').value = '';
        document.getElementById('sNewPass').value = '';
        EDY.ui.toast('Password updated');
      } catch (e) { EDY.ui.toast(e.message || 'Password change failed', 'error'); }
    });

    // ---- sectioned settings layout ----
    // The page above is a long stack of cards. Turn it into categories so each
    // one (Invoice, Business, Money & Tax, ...) can be opened on its own from a
    // sidebar menu or the drop-down above it. The input elements keep their ids,
    // so saving, live previews and the admin permission gating work unchanged.
    function organizeSettingsShell(host) {
      const row = host.querySelector(':scope > .row.g-4');
      if (!row) return;

      // 1. Flatten the two Bootstrap columns so every card sits directly in the row.
      [...row.querySelectorAll(':scope > .col-12.col-lg-6')].forEach(col => {
        [...col.children].forEach(node => row.insertBefore(node, col));
        col.remove();
      });

      // 2. Group the cards into sections by the input ids they contain.
      const cards = [...row.querySelectorAll(':scope > .card')];
      const groupCards = (key, label, icon, sels) => ({
        key, label, icon,
        cards: cards.filter(c => sels.some(sel => c.querySelector(sel)))
      });
      const groups = [
        groupCards('business', 'Business', 'bi-building', ['#sBizName', '#sLogo', '#sBizAddr']),
        groupCards('money', 'Money & Tax', 'bi-cash-stack', ['#sCurrency']),
        groupCards('regional', 'Regional & Time', 'bi-globe2', ['#sTimezone']),
        groupCards('operations', 'Operations', 'bi-sliders', ['#sEditDays']),
        groupCards('receipt', 'Receipt Layout', 'bi-receipt', ['#sRcptHead']),
        groupCards('invoice', 'Invoice & Design', 'bi-file-earmark-text', ['#sInvFormat']),
        groupCards('language', 'Language', 'bi-translate', ['#sLang']),
        groupCards('security', 'Security', 'bi-shield-lock', ['#btnChgPass'])
      ];

      // 3. Build the section panels, sidebar menu and top drop-down.
      const sections = document.createElement('div');
      sections.className = 'settings-sections';
      groups.forEach(g => {
        const sec = document.createElement('section');
        sec.id = 'sec-' + g.key;
        sec.className = 'settings-section';
        g.cards.forEach(c => sec.appendChild(c));
        sections.appendChild(sec);
      });
      const aboutCard = host.querySelector('.card.mt-4');
      if (aboutCard) {
        const sec = document.createElement('section');
        sec.id = 'sec-about';
        sec.className = 'settings-section';
        sec.appendChild(aboutCard);
        sections.appendChild(sec);
      }

      const nav = document.createElement('nav');
      nav.className = 'card settings-nav';
      const addNavBtn = (key, label, icon) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'settings-nav-btn';
        b.dataset.sec = key;
        b.innerHTML = '<i class="bi ' + icon + '"></i><span>' + esc(label) + '</span>';
        nav.appendChild(b);
      };
      groups.forEach(g => addNavBtn(g.key, g.label, g.icon));
      if (aboutCard) addNavBtn('about', 'About', 'bi-info-circle');

      const drop = document.createElement('select');
      drop.id = 'settingsNavDrop';
      drop.className = 'form-select form-select-sm settings-nav-drop';
      groups.forEach(g => {
        const o = document.createElement('option');
        o.value = g.key;
        o.textContent = g.label;
        drop.appendChild(o);
      });
      if (aboutCard) {
        const o = document.createElement('option');
        o.value = 'about';
        o.textContent = 'About';
        drop.appendChild(o);
      }

      const main = document.createElement('div');
      main.className = 'settings-main';
      main.appendChild(drop);
      main.appendChild(sections);

      const shell = document.createElement('div');
      shell.className = 'settings-layout';
      shell.appendChild(nav);
      shell.appendChild(main);

      // 4. The Save bar lives under the sections so it is visible on every panel.
      const saveBar = host.querySelector(':scope > .d-flex.justify-content-end.mt-4');
      if (saveBar) main.appendChild(saveBar);

      row.parentNode.insertBefore(shell, row);
      row.remove();

      // 5. Panel switching: sidebar buttons, the drop-down, and deep links.
      let active = null;
      function showSection(key, scroll) {
        const sec = document.getElementById('sec-' + key);
        if (!sec) return;
        [...sections.children].forEach(s => s.classList.toggle('d-none', s !== sec));
        [...nav.children].forEach(b => b.classList.toggle('active', b.dataset.sec === key));
        drop.value = key;
        active = key;
        if (scroll) main.scrollIntoView({ block: 'start', behavior: 'smooth' });
        else sections.scrollTop = 0;
      }
      [...nav.children].forEach(b => b.addEventListener('click', () => showSection(b.dataset.sec, true)));
      drop.addEventListener('change', () => showSection(drop.value, true));

      // Honor a deep link of the form #invoice; otherwise start on Business.
      const fromHash = location.hash ? location.hash.replace(/^#\/?/, '') : '';
      const hasSec = [...nav.children].some(b => b.dataset.sec === fromHash);
      showSection(hasSec ? fromHash : 'business', false);
    }

    organizeSettingsShell(box);
  }
};