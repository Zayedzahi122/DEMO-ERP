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
    const scale = Number(S['money.scale'] ?? 3);
    const SCALE_HINT = {
      0: 'Whole units only',
      1: 'Whole and tenths',
      2: 'Most currencies (USD, EUR, SAR, AED)',
      3: 'Oman \u2014 rial and baisa',
      4: 'High precision unit pricing',
      5: 'Very high precision',
      6: 'Maximum \u2014 matches the database'
    };
    const scaleOptions = [];
    for (let i = 0; i <= MAX; i++) {
      scaleOptions.push('<option value="' + i + '"' + (i === scale ? ' selected' : '') + '>' + i + ' decimal' + (i === 1 ? '' : 's') + '</option>');
    }
    const currencyOptions = ['OMR', 'USD', 'SAR', 'AED'].map(c =>
      '<option value="' + c + '"' + (S['money.currency'] === c ? ' selected' : '') + '>' + c + '</option>').join('');

    // VAT is stored as a fraction; the form works in percent.
    const vatPct = (Number(S['tax.vatRate'] ?? 0.05) * 100);

    // Only an Administrator may change company-wide settings - PUT /api/settings is
    // restricted server side and answers 403 otherwise. Reflect that here instead of
    // letting someone fill the whole form in and only fail when they press Save.
    // "Change Password" stays open to everyone, since that one is per-user.
    const isAdmin = !!(EDY.me && EDY.me.role === 'Administrator');
    const ADMIN_FIELDS = ['sCurrency', 'sScale', 'sVat', 'sBizName', 'sBizAddr',
                          'sBizPhone', 'sBizVat', 'sRcptHead', 'sRcptFoot'];

    box.innerHTML =
      '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">' +
      '<div><h1 class="page-title mb-1">Settings</h1><div class="page-sub">Business details, money and tax rules, receipt layout</div></div>' +
      '</div>' +

      '<div class="row g-4">' +
      '<div class="col-12 col-lg-6">' +

      '<div class="card mb-4"><div class="card-header"><i class="bi bi-cash-stack me-2 text-primary"></i>Money &amp; Tax</div><div class="card-body">' +
      '<div class="row g-3 mb-3">' +
      '<div class="col-6"><label class="form-label" for="sCurrency">Currency</label><select class="form-select" id="sCurrency">' + currencyOptions + '</select></div>' +
      '<div class="col-6"><label class="form-label" for="sScale">Decimal places</label><select class="form-select" id="sScale">' + scaleOptions + '</select>' +
      '<div class="form-text">' + esc(SCALE_HINT[scale] || '') + '</div></div>' +
      '</div>' +
      '<div class="mb-2"><label class="form-label" for="sVat">VAT rate (%)</label><input class="form-control" id="sVat" type="number" min="0" max="100" step="0.01" value="' + esc(vatPct) + '"></div>' +
      '<div class="form-text">Applied to every new sales invoice, purchase and quotation. Oman standard rate is 5%.</div>' +
      '<hr class="my-3">' +
      '<div class="d-flex align-items-center gap-2 text-muted fs-12"><i class="bi bi-info-circle"></i><span id="sScalePreview"></span></div>' +
      '</div></div>' +

      '<div class="card mb-4"><div class="card-header"><i class="bi bi-building me-2 text-primary"></i>Business Profile</div><div class="card-body">' +
      '<div class="mb-3"><label class="form-label" for="sBizName">Business Name</label><input class="form-control" id="sBizName" value="' + esc(S['biz.name'] ?? '') + '"></div>' +
      '<div class="mb-3"><label class="form-label" for="sBizAddr">Address</label><input class="form-control" id="sBizAddr" value="' + esc(S['biz.address'] ?? '') + '"></div>' +
      '<div class="row g-3"><div class="col-6"><label class="form-label" for="sBizPhone">Phone</label><input class="form-control" id="sBizPhone" value="' + esc(S['biz.phone'] ?? '') + '"></div>' +
      '<div class="col-6"><label class="form-label" for="sBizVat">VAT Registration No.</label><input class="form-control" id="sBizVat" value="' + esc(S['biz.vatNo'] ?? '') + '"></div></div>' +
      '<div class="form-text">Printed on receipts and invoices.</div>' +
      '</div></div>' +

      '<div class="card"><div class="card-header"><i class="bi bi-receipt me-2 text-primary"></i>Receipt Layout</div><div class="card-body">' +
      '<div class="mb-3"><label class="form-label" for="sRcptHead">Receipt Header</label><input class="form-control" id="sRcptHead" value="' + esc(S['receipt.header'] ?? '') + '"></div>' +
      '<div class="mb-3"><label class="form-label" for="sRcptFoot">Receipt Footer</label><textarea class="form-control" id="sRcptFoot" rows="2">' + esc(S['receipt.footer'] ?? '') + '</textarea></div>' +
      '</div></div>' +
      '</div>' +

      '<div class="col-12 col-lg-6">' +
      '<div class="card mb-4"><div class="card-header"><i class="bi bi-globe me-2 text-primary"></i>Language</div><div class="card-body">' +
      '<div class="mb-3"><label class="form-label" for="sLang">Display Language</label><select class="form-select" id="sLang"><option value="en"' + (EDY.i18n && EDY.i18n.isArabic() ? '' : ' selected') + '>English</option><option value="ar"' + (EDY.i18n && EDY.i18n.isArabic() ? ' selected' : '') + '>\u0627\u0644\u0639\u0631\u0628\u064a\u0629 (Arabic)</option></select>' +
      '<div class="form-text">Applies to this browser only.</div></div>' +
      '</div></div>' +

      '<div class="card mb-4"><div class="card-header"><i class="bi bi-shield-lock me-2 text-primary"></i>Security</div><div class="card-body">' +
      '<div class="mb-3"><label class="form-label">Change Password</label><div class="row g-2"><div class="col"><input class="form-control" type="password" id="sOldPass" placeholder="Current password" autocomplete="current-password"></div>' +
      '<div class="col"><input class="form-control" type="password" id="sNewPass" placeholder="New password" autocomplete="new-password"></div></div></div>' +
      '<button class="btn btn-primary" id="btnChgPass">Update Password</button>' +
      '</div></div>' +

      '<div class="card"><div class="card-header"><i class="bi bi-info-circle me-2 text-primary"></i>About these settings</div><div class="card-body fs-12 muted">' +
      '<p class="mb-2">Every value on this page is stored in the database and applies to all users, on every screen.</p>' +
      '<p class="mb-0">Decimal places can be set from 0 to ' + MAX + '. Money columns are stored with 6 decimal places, so anything above ' + MAX + ' could not be saved.</p>' +
      '</div></div>' +
      '</div>' +
      '</div>' +

      '<div class="d-flex justify-content-end mt-4 mb-4">' +
      (isAdmin
        ? '<button class="btn btn-primary btn-lg px-5" id="btnSave"><i class="bi bi-check-lg me-1"></i>Save Settings</button>'
        : '<div class="alert alert-warning mb-0 py-2 px-3 fs-12"><i class="bi bi-lock me-1"></i>Only an Administrator can change these settings. You are signed in as <strong>' +
          esc(EDY.me && EDY.me.role ? EDY.me.role : 'a restricted user') + '</strong>.</div>') +
      '</div>';

    if (!isAdmin) {
      ADMIN_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = true;
      });
    }

    // Live preview so the effect of the scale/currency choice is obvious.
    function refreshPreview() {
      const d = Number(document.getElementById('sScale').value);
      const cur = document.getElementById('sCurrency').value;
      const hint = SCALE_HINT[d] || '';
      const el = document.getElementById('sScalePreview');
      if (el) el.textContent = 'Preview: ' + new Intl.NumberFormat('en-US', {
        style: 'currency', currency: cur, minimumFractionDigits: d, maximumFractionDigits: d
      }).format(1234.5) + '   \u00b7   ' + hint;
    }
    document.getElementById('sScale').addEventListener('change', refreshPreview);
    document.getElementById('sCurrency').addEventListener('change', refreshPreview);
    refreshPreview();

    if (isAdmin) document.getElementById('btnSave').addEventListener('click', async () => {
      const scale = Number(document.getElementById('sScale').value);
      if (!Number.isInteger(scale) || scale < 0 || scale > MAX) {
        EDY.ui.toast('Decimal places must be between 0 and ' + MAX, 'warning');
        return;
      }
      const vat = Number(document.getElementById('sVat').value);
      if (!Number.isFinite(vat) || vat < 0 || vat > 100) {
        EDY.ui.toast('VAT rate must be between 0 and 100', 'warning');
        return;
      }

      const lang = document.getElementById('sLang').value;
      const body = {
        'money.scale': scale,
        'money.currency': document.getElementById('sCurrency').value,
        'tax.vatRate': String(vat / 100),
        'biz.name': document.getElementById('sBizName').value.trim(),
        'biz.address': document.getElementById('sBizAddr').value.trim(),
        'biz.phone': document.getElementById('sBizPhone').value.trim(),
        'biz.vatNo': document.getElementById('sBizVat').value.trim(),
        'receipt.header': document.getElementById('sRcptHead').value.trim(),
        'receipt.footer': document.getElementById('sRcptFoot').value.trim(),
        'app.language': lang
      };

      const btn = document.getElementById('btnSave');
      btn.disabled = true;
      try {
        const saved = await EDY.api.put('/api/settings', body);
        // The server clamps and defaults, so adopt exactly what it stored.
        Object.assign(EDY.settings, saved);
        if (EDY.i18n) EDY.i18n.setLang(lang);
        EDY.ui.toast('Settings saved');
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
  }
};