/* EDY ERP — Settings */
window.PAGE = {
  init: function () {
    const box = document.getElementById('pageContent');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const get = (k, d) => localStorage.getItem('edy.' + k) || d;
    const set = (k, v) => localStorage.setItem('edy.' + k, v);

    const S = {
      bizName: get('bizName', 'EDY ERP'),
      bizAddress: get('bizAddress', 'Muscat, Oman'),
      bizPhone: get('bizPhone', '+968 24XX XXXX'),
      bizVat: get('bizVat', 'OM 123456789012345'),
      currency: get('currency', 'OMR'),
      vatRate: get('vatRate', '5'),
      receiptHeader: get('receiptHeader', 'EDY ERP \u2014 Main Branch'),
      receiptFooter: get('receiptFooter', 'Thank you for your business! \u0634\u0643\u0631\u0627\u064b'),
      lowStockAlert: get('lowStockAlert', '10'),
      emailNotifications: get('emailNotifications', 'false'),
      expiryAlerts: get('expiryAlerts', 'false'),
      language: get('language', 'en'),
      locations: (() => { try { const v = JSON.parse(localStorage.getItem('edy.locations') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } })(),
      invoicePrefix: get('invoicePrefix', 'INV'),
      invoiceDueDays: get('invoiceDueDays', '30'),
      invoiceTerms: get('invoiceTerms', 'Net ' + (get('invoiceDueDays', '30'))),
      invoiceNotes: get('invoiceNotes', ''),
      barcodeStandard: get('barcodeStandard', 'CODE128'),
      barcodeWidth: get('barcodeWidth', '50'),
      barcodeHeight: get('barcodeHeight', '25'),
      barcodeCopies: get('barcodeCopies', '1'),
      barcodeShowName: get('barcodeShowName', 'true'),
      barcodeShowPrice: get('barcodeShowPrice', 'true'),
      barcodeShowSku: get('barcodeShowSku', 'false'),
      printers: (() => { try { const v = JSON.parse(localStorage.getItem('edy.printers') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } })()
    };

    box.innerHTML =
      '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">' +
      '<div><h1 class="page-title mb-1">Settings</h1><div class="page-sub">Business configuration, preferences and receipt settings</div></div>' +
      '</div>' +

      '<div class="row g-4">' +
      '<div class="col-12 col-lg-6">' +
      '<div class="card mb-4"><div class="card-header"><i class="bi bi-building me-2 text-primary"></i>Business Profile</div><div class="card-body">' +
      '<div class="mb-3"><label class="form-label">Business Name</label><input class="form-control" id="sBizName" value="' + esc(S.bizName) + '"></div>' +
      '<div class="mb-3"><label class="form-label">Address</label><input class="form-control" id="sBizAddr" value="' + esc(S.bizAddress) + '"></div>' +
      '<div class="row g-3"><div class="col-6"><label class="form-label">Phone</label><input class="form-control" id="sBizPhone" value="' + esc(S.bizPhone) + '"></div>' +
      '<div class="col-6"><label class="form-label">VAT Registration No.</label><input class="form-control" id="sBizVat" value="' + esc(S.bizVat) + '"></div></div>' +
      '</div></div>' +

      '<div class="card mb-4"><div class="card-header"><i class="bi bi-cash-stack me-2 text-primary"></i>Currency &amp; Tax</div><div class="card-body">' +
      '<div class="row g-3">' +
      '<div class="col-6"><label class="form-label">Default Currency</label><select class="form-select" id="sCurrency"><option value="OMR"' + (S.currency === 'OMR' ? ' selected' : '') + '>OMR \u2014 Omani Rial</option><option value="USD"' + (S.currency === 'USD' ? ' selected' : '') + '>USD \u2014 US Dollar</option><option value="SAR"' + (S.currency === 'SAR' ? ' selected' : '') + '>SAR \u2014 Saudi Riyal</option><option value="AED"' + (S.currency === 'AED' ? ' selected' : '') + '>AED \u2014 UAE Dirham</option></select></div>' +
      '<div class="col-6"><label class="form-label">VAT Rate (%)</label><input class="form-control" id="sVat" type="number" min="0" max="100" step="0.1" value="' + S.vatRate + '"><div class="form-text">Oman standard rate is 5%</div></div>' +
      '</div></div></div>' +

      '<div class="card"><div class="card-header"><i class="bi bi-receipt me-2 text-primary"></i>Receipt Settings</div><div class="card-body">' +
      '<div class="mb-3"><label class="form-label">Receipt Header</label><input class="form-control" id="sRcptHead" value="' + esc(S.receiptHeader) + '"></div>' +
      '<div class="mb-3"><label class="form-label">Receipt Footer</label><textarea class="form-control" id="sRcptFoot" rows="2">' + esc(S.receiptFooter) + '</textarea></div>' +
      '</div></div>' +
      '</div>' +

      '<div class="col-12 col-lg-6">' +
      '<div class="card mb-4"><div class="card-header"><i class="bi bi-bell me-2 text-primary"></i>Notifications</div><div class="card-body">' +
      '<div class="form-check form-switch mb-3"><input class="form-check-input" type="checkbox" id="sEmailNotif"' + (S.emailNotifications === 'true' ? ' checked' : '') + '><label class="form-check-label" for="sEmailNotif">Email notifications (low stock alerts)</label></div>' +
      '<div class="form-check form-switch mb-3"><input class="form-check-input" type="checkbox" id="sExpiryAlerts"' + (S.expiryAlerts === 'true' ? ' checked' : '') + '><label class="form-check-label" for="sExpiryAlerts">Product expiry alerts</label></div>' +
      '<div><label class="form-label">Low stock alert threshold</label><input class="form-control" id="sLowStock" type="number" min="1" value="' + S.lowStockAlert + '"><div class="form-text">Products at or below this quantity trigger alerts</div></div>' +
      '</div></div>' +

      '<div class="card mb-4"><div class="card-header"><i class="bi bi-globe me-2 text-primary"></i>Language &amp; Region</div><div class="card-body">' +
      '<div class="mb-3"><label class="form-label">Display Language</label><select class="form-select" id="sLang"><option value="en"' + (S.language === 'en' ? ' selected' : '') + '>English</option><option value="ar"' + (S.language === 'ar' ? ' selected' : '') + '>\u0627\u0644\u0639\u0631\u0628\u064a\u0629 (Arabic)</option></select></div>' +
      '</div></div>' +

      '<div class="card"><div class="card-header"><i class="bi bi-shield-lock me-2 text-primary"></i>Security</div><div class="card-body">' +
      '<div class="mb-3"><label class="form-label">Change Password</label><div class="row g-2"><div class="col"><input class="form-control" type="password" id="sOldPass" placeholder="Current password"></div><div class="col"><input class="form-control" type="password" id="sNewPass" placeholder="New password"></div></div></div>' +
      '<button class="btn btn-primary" id="btnChgPass">Update Password</button>' +
      '</div></div>' +
      '</div>' +
      '</div>' +

      '<div class="row g-4 mt-1">' +
      '<div class="col-12 col-lg-6">' +
      '<div class="card mb-4"><div class="card-header"><i class="bi bi-geo-alt me-2 text-primary"></i>Business Locations</div><div class="card-body">' +
      '<div id="sLocList"></div>' +
      '<button class="btn btn-outline-primary btn-sm" id="btnAddLoc" type="button"><i class="bi bi-plus-lg me-1"></i>Add Location</button>' +
      '<div class="form-text mt-2">Branches/stores used for sales and inventory tracking</div>' +
      '</div></div>' +
      '<div class="card mb-4"><div class="card-header"><i class="bi bi-receipt me-2 text-primary"></i>Invoice Settings</div><div class="card-body">' +
      '<div class="mb-3"><label class="form-label">Invoice Number Prefix</label><input class="form-control" id="sInvPrefix" value="' + esc(S.invoicePrefix) + '"></div>' +
      '<div class="mb-3"><label class="form-label">Default Due (Days)</label><input class="form-control" id="sInvDue" type="number" min="0" max="365" value="' + esc(S.invoiceDueDays) + '"></div>' +
      '<div class="mb-3"><label class="form-label">Default Payment Terms</label><input class="form-control" id="sInvTerms" value="' + esc(S.invoiceTerms) + '"></div>' +
      '<div class="mb-3"><label class="form-label">Default Invoice Notes</label><textarea class="form-control" id="sInvNotes" rows="2">' + esc(S.invoiceNotes) + '</textarea></div>' +
      '</div></div>' +
      '</div>' +
      '<div class="col-12 col-lg-6">' +
      '<div class="card mb-4"><div class="card-header"><i class="bi bi-upc-scan me-2 text-primary"></i>Barcode Settings</div><div class="card-body">' +
      '<div class="row g-3 mb-3">' +
      '<div class="col-6"><label class="form-label">Barcode Standard</label><select class="form-select" id="sBarStd"><option value="CODE128"' + (S.barcodeStandard === 'CODE128' ? ' selected' : '') + '>Code 128</option><option value="EAN13"' + (S.barcodeStandard === 'EAN13' ? ' selected' : '') + '>EAN-13</option><option value="CODE39"' + (S.barcodeStandard === 'CODE39' ? ' selected' : '') + '>Code 39</option><option value="UPC-A"' + (S.barcodeStandard === 'UPC-A' ? ' selected' : '') + '>UPC-A</option></select></div>' +
      '<div class="col-6"><label class="form-label">Copies per Sheet</label><input class="form-control" id="sBarCopies" type="number" min="1" max="50" value="' + esc(S.barcodeCopies) + '"></div>' +
      '</div>' +
      '<div class="row g-3 mb-3">' +
      '<div class="col-6"><label class="form-label">Label Width (mm)</label><input class="form-control" id="sBarW" type="number" min="20" max="120" value="' + esc(S.barcodeWidth) + '"></div>' +
      '<div class="col-6"><label class="form-label">Label Height (mm)</label><input class="form-control" id="sBarH" type="number" min="10" max="80" value="' + esc(S.barcodeHeight) + '"></div>' +
      '</div>' +
      '<div class="form-check form-switch mb-2"><input class="form-check-input" type="checkbox" id="sBarName"' + (S.barcodeShowName === 'true' ? ' checked' : '') + '><label class="form-check-label" for="sBarName">Show product name</label></div>' +
      '<div class="form-check form-switch mb-2"><input class="form-check-input" type="checkbox" id="sBarPrice"' + (S.barcodeShowPrice === 'true' ? ' checked' : '') + '><label class="form-check-label" for="sBarPrice">Show price</label></div>' +
      '<div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="sBarSku"' + (S.barcodeShowSku === 'true' ? ' checked' : '') + '><label class="form-check-label" for="sBarSku">Show SKU code</label></div>' +
      '</div></div>' +
      '<div class="card mb-4"><div class="card-header"><i class="bi bi-printer me-2 text-primary"></i>Receipt Printers</div><div class="card-body">' +
      '<div id="sPrnList"></div>' +
      '<button class="btn btn-outline-primary btn-sm" id="btnAddPrn" type="button"><i class="bi bi-plus-lg me-1"></i>Add Printer</button>' +
      '<div class="form-text mt-2">Cash drawer / receipt printers available at the register</div>' +
      '</div></div>' +
      '</div>' +
      '</div>' +

      '<div class="d-flex justify-content-end mt-4 mb-4"><button class="btn btn-primary btn-lg px-5" id="btnSave"><i class="bi bi-check-lg me-1"></i>Save Settings</button></div>';

    function collectItems(id) {
      return Array.from(document.querySelectorAll('#' + id + ' .edy-row'))
        .map(r => ({
          name: (r.querySelector('.edy-f-name') || {}).value || '',
          extra: (r.querySelector('.edy-f-extra') || {}).value || ''
        }))
        .filter(x => x.name.trim() !== '');
    }
    function renderItems(id, items, ph) {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = items.map((it, i) =>
        '<div class="row g-2 align-items-center mb-2 edy-row" data-i="' + i + '">' +
        '<div class="col-4"><input class="form-control form-control-sm edy-f-name" value="' + esc(it.name || '') + '" placeholder="' + ph.name + '"></div>' +
        '<div class="col-5"><input class="form-control form-control-sm edy-f-extra" value="' + esc(it.extra || '') + '" placeholder="' + ph.extra + '"></div>' +
        '<div class="col-3 text-end"><button class="btn btn-sm btn-outline-danger edy-del" type="button"><i class="bi bi-trash"></i></button></div>' +
        '</div>').join('') +
        (items.length ? '' : '<div class="form-text">' + ph.empty + '</div>');
      el.querySelectorAll('.edy-del').forEach(b => b.addEventListener('click', () => {
        const arr = collectItems(id);
        arr.splice(+b.closest('.edy-row').dataset.i, 1);
        renderItems(id, arr, ph);
      }));
    }
    const locPh = { name: 'Branch / Location name', extra: 'City, address', empty: 'No branches yet — add your first location' };
    const prnPh = { name: 'Printer name', extra: 'Driver / interface', empty: 'No printers yet — add a receipt printer' };
    renderItems('sLocList', Array.isArray(S.locations) ? S.locations : [], locPh);
    renderItems('sPrnList', Array.isArray(S.printers) ? S.printers : [], prnPh);
    document.getElementById('btnAddLoc').addEventListener('click', () => {
      const arr = collectItems('sLocList');
      arr.push({ name: '', extra: '' });
      renderItems('sLocList', arr, locPh);
    });
    document.getElementById('btnAddPrn').addEventListener('click', () => {
      const arr = collectItems('sPrnList');
      arr.push({ name: '', extra: '' });
      renderItems('sPrnList', arr, prnPh);
    });

    document.getElementById('btnSave').addEventListener('click', () => {
      set('locations', JSON.stringify(collectItems('sLocList')));
      set('printers', JSON.stringify(collectItems('sPrnList')));
      set('bizName', document.getElementById('sBizName').value.trim());
      set('bizAddress', document.getElementById('sBizAddr').value.trim());
      set('bizPhone', document.getElementById('sBizPhone').value.trim());
      set('bizVat', document.getElementById('sBizVat').value.trim());
      set('currency', document.getElementById('sCurrency').value);
      set('vatRate', document.getElementById('sVat').value);
      set('receiptHeader', document.getElementById('sRcptHead').value.trim());
      set('receiptFooter', document.getElementById('sRcptFoot').value.trim());
      set('lowStockAlert', document.getElementById('sLowStock').value);
      set('emailNotifications', document.getElementById('sEmailNotif').checked ? 'true' : 'false');
      set('expiryAlerts', document.getElementById('sExpiryAlerts').checked ? 'true' : 'false');
      set('language', document.getElementById('sLang').value);
      if (EDY.i18n) EDY.i18n.setLang(document.getElementById('sLang').value);
      EDY.ui.toast('Settings saved');
    });

    document.getElementById('btnChgPass').addEventListener('click', async () => {
      const oldPass = document.getElementById('sOldPass').value;
      const newPass = document.getElementById('sNewPass').value;
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