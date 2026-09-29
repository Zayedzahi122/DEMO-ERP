/* EDY ERP — Sales */
window.PAGE = {
  init: async function () {
    const box = document.getElementById('pageContent');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    let invoices = [];
    let customers = [];
    let products = [];

    box.innerHTML =
      '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">' +
      '<div><h1 class="page-title mb-1">Sales</h1><div class="page-sub">All sales invoices and transactions</div></div>' +
      '<button class="btn btn-primary" id="btnNew"><i class="bi bi-plus-lg me-1"></i>New Sale</button>' +
      '</div>' +

      '<div class="row g-3 mb-4" id="kpis">' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value" id="kCount">\u2014</div><div class="stat-label">Total Invoices</div></div></div></div>' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value text-green" id="kTotal">\u2014</div><div class="stat-label">Sales Revenue</div></div></div></div>' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value text-blue" id="kVat">\u2014</div><div class="stat-label">VAT Collected</div></div></div></div>' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value text-red" id="kCanc">\u2014</div><div class="stat-label">Cancelled</div></div></div></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-body">' +
      '<div class="d-flex flex-wrap gap-2 mb-3">' +
      '<div class="topbar-search" style="max-width:300px"><i class="bi bi-search"></i><input id="tblSearch" placeholder="Search invoice / customer&hellip;"></div>' +
      '<select class="form-select w-auto" id="statusFilter"><option value="">All statuses</option><option value="CONFIRMED">Confirmed</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="CREDIT">Credit</option><option value="DUE">Due (unpaid credit)</option><option value="DRAFT">Draft</option><option value="CANCELLED">Deleted</option></select>' +
      '<select class="form-select w-auto" id="sDatePreset" title="Filter sales by date">' +
        '<option value="">All dates</option>' +
        '<option value="TODAY">Today</option>' +
        '<option value="YESTERDAY">Yesterday</option>' +
        '<option value="THIS_MONTH">This month</option>' +
        '<option value="LAST_MONTH">Last month</option>' +
        '<option value="THIS_YEAR">This year</option>' +
        '<option value="LAST_YEAR">Last year</option>' +
        '<option value="CUSTOM">Custom range</option>' +
      '</select>' +
      '<span class="d-none align-items-center gap-2" id="sCustomDates">' +
        '<input type="date" class="form-control form-control-sm w-auto" id="sDateFrom" title="From date (invoice)">' +
        '<input type="date" class="form-control form-control-sm w-auto" id="sDateTo" title="To date (invoice)">' +
        '<button class="btn btn-ghost btn-sm" type="button" id="sClearDates" title="Clear the date filter"><i class="bi bi-x-circle me-1"></i>Clear</button>' +
      '</span>' +
      '<button class="btn btn-ghost me-auto" id="btnImport"><i class="bi bi-upload me-1"></i>Import</button>' +
      '<button class="btn btn-ghost ms-auto" id="btnCsv"><i class="bi bi-download me-1"></i>CSV</button>' +
      '</div>' +
      '<div class="table-wrap"><table class="table" id="sTable"></table></div>' +
      '</div></div>';

    let table = null;

    function statusBadge(s) {
      const map = {
        PAID: '<span class="badge bg-soft-green">Paid</span>',
        CONFIRMED: '<span class="badge bg-soft-amber">Confirmed</span>',
        PENDING: '<span class="badge bg-soft-blue">Pending</span>',
        CREDIT: '<span class="badge bg-soft-purple">Credit</span>',
        DUE: '<span class="badge bg-soft-red">Due</span>',
        DRAFT: '<span class="badge bg-soft-gray">Draft</span>',
        CANCELLED: '<span class="badge bg-soft-red">Cancelled</span>'
      };
      return map[s] || '<span class="badge bg-soft-gray">' + esc(s) + '</span>';
    }

    // A sale paid with more than one method shows as "Multipay".
    function payMethodLabel(inv) {
      const pays = (Array.isArray(inv.payments) ? inv.payments : []).map(p => p.method).filter(Boolean);
      const distinct = [...new Set(pays)];
      if (distinct.length > 1) return 'Multipay';
      if (pays.length === 1) return distinct[0];
      return inv.paymentMethod || 'CASH';
    }

    function payMethodTitle(inv) {
      const pays = (Array.isArray(inv.payments) ? inv.payments : []).map(p => p.method).filter(Boolean);
      return pays.length ? [...new Set(pays)].join(' + ') : (inv.paymentMethod || 'CASH');
    }

    function isoDate(d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    // Date presets for the dropdown. Returns [from, to] or null for no filter.
    function presetRange(preset) {
      const now = new Date();
      const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
      if (preset === 'TODAY') return [isoDate(now), isoDate(now)];
      if (preset === 'YESTERDAY') { const yd = new Date(y, m, d - 1); return [isoDate(yd), isoDate(yd)]; }
      if (preset === 'THIS_MONTH') return [isoDate(new Date(y, m, 1)), isoDate(new Date(y, m + 1, 0))];
      if (preset === 'LAST_MONTH') return [isoDate(new Date(y, m - 1, 1)), isoDate(new Date(y, m, 0))];
      if (preset === 'THIS_YEAR') return [isoDate(new Date(y, 0, 1)), isoDate(new Date(y, 11, 31))];
      if (preset === 'LAST_YEAR') return [isoDate(new Date(y - 1, 0, 1)), isoDate(new Date(y - 1, 11, 31))];
      return null;
    }

    function render(statusOverride) {
      const qfilter = new URLSearchParams(location.search).get('status');
      const sf = document.getElementById('statusFilter');
      const df = document.getElementById('sDateFrom'), dt = document.getElementById('sDateTo');
      if (qfilter) sf.value = qfilter;
      const activeStatus = (statusOverride !== undefined && statusOverride !== null) ? statusOverride : sf.value;
      let list = invoices.filter(i => (i.status || '') !== 'CANCELLED');
      if (activeStatus === 'CANCELLED') list = invoices.filter(i => (i.status || '') === 'CANCELLED'); else if (activeStatus) list = list.filter(i => (i.status || '') === activeStatus);

      // custom range is the only mode that reads the two date boxes
      const preset = document.getElementById('sDatePreset').value;
      const range = preset === 'CUSTOM' ? [df.value, dt.value] : presetRange(preset);
      if (range) {
        if (range[0]) list = list.filter(i => String(i.invoiceDate || '').slice(0,10) >= range[0]);
        if (range[1]) list = list.filter(i => String(i.invoiceDate || '').slice(0,10) <= range[1]);
      }

      // Newest first, so a sale you just entered is always on page 1.
      list = list.slice().sort((a, b) =>
        String(b.invoiceDate || '').localeCompare(String(a.invoiceDate || '')) || (b.id - a.id));


      const total = invoices.filter(i => i.status !== 'CANCELLED').reduce((s, i) => s + Number(i.totalAmount || 0), 0);
      const vat = invoices.filter(i => i.status !== 'CANCELLED').reduce((s, i) => s + Number(i.taxAmount || 0), 0);
      document.getElementById('kCount').textContent = invoices.length;
      document.getElementById('kTotal').textContent = EDY.fmt.money(total);
      document.getElementById('kVat').textContent = EDY.fmt.money(vat);
      document.getElementById('kCanc').textContent = invoices.filter(i => i.status === 'CANCELLED').length;

      table = EDY.ui.table({
        el: document.getElementById('sTable'),
        searchInput: document.getElementById('tblSearch'),
        searchKeys: ['invoiceNumber'],
        data: list,
        pageSize: 10,
        columns: [
          { key: 'invoiceNumber', label: 'Invoice', render: (r) => '<span class="fw-bold">' + esc(r.invoiceNumber) + '</span>' },
          { key: 'invoiceDate', label: 'Date', date: true },
          { key: 'customer', label: 'Customer', render: (r) => {
            let name = '\u2014';
            if (r.customer) name = r.customer.name;
            else if (r.customerName) name = r.customerName;
            else if (r.walkinName) name = r.walkinName + ' <span class="muted fs-12">(walk-in)</span>';
            return name; } },
          { key: 'paymentMethod', label: 'Payment', render: (r) => '<span title="' + esc(payMethodTitle(r)) + '">' + esc(payMethodLabel(r)) + '</span>' },
          { key: 'items', label: 'Items', render: (r) => Array.isArray(r.items) ? r.items.reduce((s, it) => s + it.quantity, 0) : 0 },
          { key: 'discount', label: 'Discount', money: true },
          { key: 'taxAmount', label: 'VAT', money: true },
          { key: 'totalAmount', label: 'Total', money: true, className: 'fw-bold' },
          { key: 'amountPaid', label: 'Paid', money: true, render: (r) => {
              const paid = Number(r.amountPaid || 0);
              const due = Number(r.balanceDue || 0);
              return paid > 0 ? EDY.fmt.money(paid) : '<span class="muted">' + EDY.fmt.money(0) + '</span>';
            } },
          { key: 'balanceDue', label: 'Due', money: true, render: (r) => {
              const due = Number(r.balanceDue || 0);
              if (r.status === 'CANCELLED') return '<span class="muted">&mdash;</span>';
              if (due > 0.001) return '<span class="text-red fw-semibold">' + EDY.fmt.money(due) + '</span>';
              if (r.status === 'DUE' || r.status === 'CREDIT') return '<span class="text-red fw-semibold">' + EDY.fmt.money(r.totalAmount || 0) + '</span>';
              return '<span class="text-green">' + EDY.fmt.money(0) + '</span>';
            } },
          { key: 'status', label: 'Status', render: (r) => statusBadge(r.status) },
          { key: 'id', label: 'Actions', render: (r) =>
            '<button class="btn btn-soft-primary btn-icon me-1" data-view="' + r.id + '" title="View / print"><i class="bi bi-eye"></i></button>' +
            (r.status !== 'CANCELLED' ? '<button class="btn btn-soft-warning btn-icon me-1" data-edit="' + r.id + '" title="Edit sale"><i class="bi bi-pencil"></i></button>' : '') +
            (r.status !== 'CANCELLED' ? '<button class="btn btn-soft-danger btn-icon" data-cancel="' + r.id + '" title="Cancel sale"><i class="bi bi-x-circle"></i></button>' : '') }
        ],
        emptyText: 'No sales yet. Create one from POS or the New Sale button.'
      });

      box.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => view(Number(b.dataset.view))));
      box.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editSale(Number(b.dataset.edit))));
      box.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', () => cancel(Number(b.dataset.cancel))));
    }

    function view(id) {
      const inv = invoices.find(i => i.id === id);
      if (!inv) return;
      EDY.ui.openModal('invModal');
      const itm = Array.isArray(inv.items) ? inv.items : [];
      let rows = itm.map(it => {
        const nm = (it.product && it.product.name) || it.productName || 'Product #' + it.productId;
        return '<tr><td>' + esc(nm) + '</td><td>' + it.quantity + '</td><td>' + EDY.fmt.money(it.unitPrice) + '</td><td>' + EDY.fmt.money(it.lineTotal) + '</td></tr>';
      }).join('') || '<tr><td colspan="4" class="text-center muted">No items</td></tr>';
      document.getElementById('invBody').innerHTML =
        '<div class="d-flex justify-content-between mb-3"><div><div class="fw-bold fs-5">' + esc(inv.invoiceNumber) + '</div><div class="muted">' + EDY.fmt.datetime(inv.invoiceDate) + '</div></div>' + statusBadge(inv.status) + '</div>' +
        '<div class="row mb-3"><div class="col-6"><div class="muted fs-12">Customer</div><div class="fw-bold">' + esc((inv.customer && inv.customer.name) || inv.customerName || inv.walkinName || '\u2014') + '</div></div>' +
        '<div class="col-6"><div class="muted fs-12">Payment</div><div class="fw-bold" title="' + esc(payMethodTitle(inv)) + '">' + esc(payMethodLabel(inv)) + '</div></div></div>' +
        '<table class="table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<div class="d-flex justify-content-between fw-bold"><span>Subtotal</span><span>' + EDY.fmt.money(inv.subtotal) + '</span></div>' +
        '<div class="d-flex justify-content-between muted"><span>Discount</span><span>\u2212' + EDY.fmt.money(inv.discount || 0) + '</span></div>' +
        '<div class="d-flex justify-content-between muted"><span>VAT (5%)</span><span>' + EDY.fmt.money(inv.taxAmount || 0) + '</span></div>' +
        '<div class="d-flex justify-content-between fw-bold fs-5 border-top mt-2 pt-2"><span>Total</span><span>' + EDY.fmt.money(inv.totalAmount) + '</span></div>' +
        ((inv.payments && inv.payments.length)
          ? (inv.payments || []).map(p => '<div class="d-flex justify-content-between fs-13"><span class="muted">Paid (' + esc(p.method || 'CASH') + ')</span><span>' + EDY.fmt.money(p.amount) + '</span></div>').join('') : '') +
        '<div class="d-flex justify-content-between fw-bold ' + (Number(inv.balanceDue || 0) > 0.001 ? 'text-red' : 'text-green') + '"><span>Balance due</span><span>' + EDY.fmt.money(inv.balanceDue || 0) + '</span></div>';
    }

    async function cancel(id) {
      const inv = invoices.find(i => i.id === id);
      const ok = await EDY.ui.confirm('Cancel this sale?', inv.invoiceNumber + ' for ' + EDY.fmt.money(inv.totalAmount) + ' will be voided. Stock is returned to inventory and VAT is removed.');
      if (!ok) return;
      try {
        await EDY.api.post('/api/sales-invoices/' + id + '/cancel', {});
        EDY.ui.toast('Sale cancelled \u2014 stock restored');
        invoices = await EDY.api.get('/api/sales-invoices');
        render();
      } catch (e) { EDY.ui.toast(e.message, 'error'); }
    }

    document.getElementById('btnNew').addEventListener('click', () => location.href = '/pos');
    document.getElementById('statusFilter').addEventListener('change', () => {
      const v = document.getElementById('statusFilter').value;
      try { history.replaceState(null, '', v ? '/sales?status=' + v : '/sales'); } catch (e) { }
      render(v);
    });

    // The two date boxes only appear for the custom-range option.
    function syncCustomDates() {
      const custom = document.getElementById('sDatePreset').value === 'CUSTOM';
      const box = document.getElementById('sCustomDates');
      box.classList.toggle('d-none', !custom);
      box.classList.toggle('d-flex', custom);
    }

    document.getElementById('sDatePreset').addEventListener('change', () => { syncCustomDates(); render(); });
    document.getElementById('sDateFrom').addEventListener('change', render);
    document.getElementById('sDateTo').addEventListener('change', render);
    document.getElementById('sClearDates').addEventListener('click', () => {
      document.getElementById('sDateFrom').value = '';
      document.getElementById('sDateTo').value = '';
      document.getElementById('sDatePreset').value = '';
      syncCustomDates();
      render();
    });

    document.getElementById('btnCsv').addEventListener('click', () => {
      const head = 'Invoice Number,Date,Customer,Payment,Items,Discount,VAT,Total,Status';
      const rows = invoices.map(i => [i.invoiceNumber, i.invoiceDate, (i.customer && i.customer.name) || i.customerName || i.walkinName || '', payMethodLabel(i), (i.items || []).reduce((s, it) => s + it.quantity, 0), i.discount || 0, i.taxAmount || 0, i.totalAmount, i.status]
        .map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','));
      const blob = new Blob(['\ufeff' + head + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sales.csv'; a.click();
      EDY.ui.toast('Sales exported to CSV');
    });

    document.getElementById('btnImport').addEventListener('click', () => document.getElementById('csvImport').click());
    document.getElementById('csvImport').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.replace(/^\ufeff/, '').trim().split(/\r?\n/).filter(Boolean);
      const parse = (line) => {
        const out = []; let cur = ''; let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQ) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') inQ = false; else cur += ch; }
          else if (ch === ',') { out.push(cur); cur = ''; }
          else cur += ch;
        }
        out.push(cur); return out;
      };
      const idx = (h) => lines[0].split(',').map(x => x.replace(/"/g, '').toLowerCase()).indexOf(h);
      const iRef = Math.max(idx('invoiceno'), idx('reference'), idx('invoice'), 0);
      const iDate = idx('date'), iCust = idx('customer'), iSku = idx('sku'), iQty = idx('quantity'), iPrice = idx('unitprice'), iPay = idx('paymentmethod');
      if (iSku < 0) { EDY.ui.toast('CSV needs a "SKU" column (import format: InvoiceNo,Date,Customer,SKU,Quantity,UnitPrice,PaymentMethod)', 'error'); e.target.value = ''; return; }

      const groups = {};
      for (const line of lines.slice(1)) {
        const c = parse(line);
        const sku = (c[iSku] || '').trim();
        if (!sku) continue;
        const ref = (c[iRef] || '').trim() || ((c[iDate] || '') + '|' + (c[iCust] || ''));
        groups[ref] = groups[ref] || { date: c[iDate] || '', customer: (c[iCust] || '').trim(), pay: c[iPay] || 'CASH', items: [] };
        groups[ref].items.push({ sku: sku, qty: Number(c[iQty]) || 1, price: iPrice >= 0 && c[iPrice] !== '' ? Number(c[iPrice]) : null });
      }

      const findSku = (sku) => (products.find(p => String(p.sku || '').toLowerCase() === sku.toLowerCase()));
      const findCust = (name) => (customers.find(c => String(c.name || '').toLowerCase() === name.toLowerCase()));

      let ok = 0, fail = 0, rc = 0;
      for (const key in groups) {
        const g = groups[key];
        const skuItems = g.items.map(it => ({ ...it, prod: findSku(it.sku) }));
        const missing = skuItems.filter(it => !it.prod);
        if (missing.length) { fail++; continue; }
        try {
          let cust = null;
          const custName = g.customer || 'Walk-in Customer';
          cust = findCust(custName);
          if (!cust) { cust = await EDY.api.post('/api/customers', { name: custName }); customers.push(cust); rc++; }
          const payload = {
            customerId: cust ? cust.id : 1,
            invoiceDate: g.date || undefined,
            paymentMethod: g.pay || 'CASH',
            items: skuItems.map(it => ({ productId: it.prod.id, quantity: it.qty, unitPrice: it.price || undefined }))
          };
          await EDY.api.post('/api/sales-invoices', payload);
          ok++;
        } catch (err) { fail++; }
      }
      e.target.value = '';
      EDY.ui.toast((ok ? ok + ' sales imported' : '') + (rc ? ' (' + rc + ' customers created)' : '') + (fail ? ', ' + fail + ' failed' : ''), fail ? 'warning' : 'success');
      invoices = await EDY.api.get('/api/sales-invoices');
      render();
    });

    const im = document.createElement('div');
    im.className = 'modal fade';
    im.id = 'invModal';
    im.innerHTML = '<div class="modal-dialog modal-dialog-centered modal-lg"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">Invoice</h5><button class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body" id="invBody"></div></div></div>';
    document.body.appendChild(im);

    /* ---------- edit modal ---------- */
    const editModal = document.createElement('div');
    editModal.className = 'modal fade'; editModal.id = 'editModal';
    editModal.innerHTML =
      '<div class="modal-dialog modal-dialog-centered modal-xl"><div class="modal-content">' +
      '<div class="modal-header"><h5 class="modal-title"><i class="bi bi-pencil-square me-2"></i>Edit Sale</h5>' +
      '<button class="btn-close" data-bs-dismiss="modal"></button></div>' +
      '<div class="modal-body" id="editBody">' +
      '<div class="row g-3 mb-3">' +
        '<div class="col-md-4"><label class="form-label">Customer</label><select class="form-select form-select-sm" id="edCust"></select></div>' +
        '<div class="col-md-2"><label class="form-label">Discount</label><input class="form-control form-control-sm" type="number" min="0" step="0.001" id="edDiscount" value="0"></div>' +
        '<div class="col-md-3"><label class="form-label">Payment</label><div class="d-flex gap-1" id="edPay">' +
          '<button class="btn btn-outline-primary btn-sm flex-fill pay-btn active" data-pay="CASH">Cash</button>' +
          '<button class="btn btn-outline-primary btn-sm flex-fill pay-btn" data-pay="CARD">Card</button>' +
          '<button class="btn btn-outline-primary btn-sm flex-fill pay-btn" data-pay="OTHER">Other</button>' +
          '<button class="btn btn-outline-primary btn-sm flex-fill pay-btn" data-pay="CREDIT">Credit</button>' +
        '</div></div>' +
        '<div class="col-md-3"><label class="form-label">Date</label><input class="form-control form-control-sm" type="date" id="edDate"></div>' +
        '<div class="col-md-3"><label class="form-label">Status</label><select class="form-select form-select-sm" id="edStatus">' +
          '<option value="CONFIRMED">Confirmed</option>' +
          '<option value="PENDING">Pending</option>' +
          '<option value="PAID">Paid</option>' +
          '<option value="CREDIT">Credit</option>' +
          '<option value="DUE">Due (unpaid credit)</option>' +
          '<option value="DRAFT">Draft</option>' +
        '</select></div>' +
      '</div>' +
      '<div class="input-group input-group-sm mb-3"><span class="input-group-text"><i class="bi bi-search"></i></span>' +
        '<input class="form-control" id="edProdSearch" placeholder="Search product by name or SKU to add&hellip;" autocomplete="off">' +
        '<button class="btn btn-outline-primary" id="edProdAdd" type="button"><i class="bi bi-plus-lg"></i></button></div>' +
      '<div id="edProdResults" class="mb-2" style="max-height:120px;overflow-y:auto"></div>' +
      '<div class="table-wrap"><table class="table table-sm"><thead><tr>' +
        '<th>Product</th><th style="width:90px">Qty</th><th style="width:110px">Unit Price</th><th style="width:100px" class="text-end">Line Total</th><th style="width:40px"></th>' +
      '</tr></thead><tbody id="edItems"></tbody></table></div>' +
      '<div class="d-flex justify-content-between mt-2"><div class="muted fs-13" id="edItemCount">0 items</div>' +
        '<div class="text-end"><div class="muted fs-13">Subtotal: <span id="edSubtotal">\u2014</span></div>' +
        '<div class="muted fs-13">VAT (5%): <span id="edTax">\u2014</span></div>' +
        '<div class="fw-bold fs-5">Total: <span id="edTotal" class="text-primary">\u2014</span></div></div>' +
      '</div>' +
      '<hr>' +
      '<div class="d-flex justify-content-between align-items-center mb-2">' +
        '<span class="form-label mb-0">Payments received</span>' +
        '<div class="d-flex gap-1">' +
          '<button class="btn btn-outline-primary btn-sm" type="button" id="edAddPay"><i class="bi bi-plus-lg me-1"></i>Add split</button>' +
          '<button class="btn btn-outline-secondary btn-sm" type="button" id="edPayFull">Pay in full</button>' +
          '<button class="btn btn-outline-secondary btn-sm" type="button" id="edPayHalf">Pay half</button>' +
        '</div>' +
      '</div>' +
      '<div class="input-group input-group-sm mb-2">' +
        '<span class="input-group-text">Amount paid</span>' +
        '<input class="form-control text-end" type="number" min="0" step="0.001" id="edAmountPaid" placeholder="0.000">' +
        '<span class="input-group-text">of <span id="edTotalForPay" class="fw-semibold">0.000</span></span>' +
      '</div>' +
      '<div id="edPayRows"></div>' +
      '<div class="d-flex justify-content-between fs-13 border-top pt-2 mt-2">' +
        '<span class="muted">Amount paid</span><span class="fw-semibold" id="edPaid">\u2014</span>' +
      '</div>' +
      '<div class="d-flex justify-content-between fs-13">' +
        '<span class="muted">Balance due</span><span class="fw-semibold" id="edDue">\u2014</span>' +
      '</div>' +
      '<div class="fs-12 muted" id="edDueNote"></div>' +
      '</div></div>' +
      '<div class="modal-footer"><button class="btn btn-ghost" data-bs-dismiss="modal">Cancel</button>' +
      '<button class="btn btn-primary" id="edSave"><i class="bi bi-check-lg me-1"></i>Save Changes</button></div></div></div>';
    document.body.appendChild(editModal);

    let editInvId = null;
    let editItems = [];
    let editPayMethod = 'CASH';
    let edStatusTouched = false;
    const allProducts = products;

    function renderEditItems() {
      const tbody = document.getElementById('edItems');
      tbody.innerHTML = editItems.length ? editItems.map((it, i) =>
        '<tr>' +
        '<td class="fs-13">' + esc(it.name) + '<div class="muted fs-11">' + esc(it.sku || '') + '</div></td>' +
        '<td><div class="d-flex align-items-center gap-1">' +
          '<button class="btn btn-outline-secondary btn-icon btn-sm ed-qty" data-delta="-1" data-idx="' + i + '"><i class="bi bi-dash"></i></button>' +
          '<span class="fs-13 fw-bold">' + it.qty + '</span>' +
          '<button class="btn btn-outline-secondary btn-icon btn-sm ed-qty" data-delta="1" data-idx="' + i + '"><i class="bi bi-plus"></i></button>' +
        '</div></td>' +
        '<td><input class="form-control form-control-sm text-end ed-price" data-idx="' + i + '" type="number" min="0" step="0.01" value="' + it.price + '"></td>' +
        '<td class="text-end fw-bold fs-13">' + EDY.fmt.money(it.price * it.qty) + '</td>' +
        '<td><button class="btn btn-ghost btn-icon btn-sm text-danger ed-remove" data-idx="' + i + '"><i class="bi bi-x-lg"></i></button></td>' +
        '</tr>').join('')
        : '<tr><td colspan="5" class="text-center muted">No items — search and add products above</td></tr>';

      tbody.querySelectorAll('.ed-qty').forEach(b => b.addEventListener('click', () => {
        const idx = Number(b.dataset.idx); const d = Number(b.dataset.delta);
        const n = editItems[idx].qty + d;
        if (n > editItems[idx].stock) { EDY.ui.toast('Only ' + editItems[idx].stock + ' in stock', 'warning'); return; }
        if (n <= 0) editItems.splice(idx, 1);
        else editItems[idx].qty = n;
        renderEditItems();
      }));
      tbody.querySelectorAll('.ed-price').forEach(inp => inp.addEventListener('input', () => {
        editItems[Number(inp.dataset.idx)].price = Number(inp.value) || 0; renderEditItems();
      }));
      tbody.querySelectorAll('.ed-remove').forEach(b => b.addEventListener('click', () => {
        editItems.splice(Number(b.dataset.idx), 1); renderEditItems();
      }));

      const sub = editItems.reduce((s, it) => s + it.price * it.qty, 0);
      const disc = Math.min(Number(document.getElementById('edDiscount').value || 0), sub);
      const taxable = sub - disc;
      const tax = taxable * 0.05;
      document.getElementById('edItemCount').textContent = editItems.length + ' item' + (editItems.length === 1 ? '' : 's');
      document.getElementById('edSubtotal').textContent = EDY.fmt.money(sub);
      document.getElementById('edTax').textContent = EDY.fmt.money(tax);
      document.getElementById('edTotal').textContent = EDY.fmt.money(editEffectiveTotal());
      renderEditPayments();
    }
    document.getElementById('edDiscount').addEventListener('input', renderEditItems);

    /* ---------- edit: split payments ---------- */
    let editPayRows = [];

    // The invoice total is always the computed one; nothing in the payment area
    // can change it, so the remainder of any part payment stays as balance due.
    function editEffectiveTotal() {
      const sub = editItems.reduce((s, it) => s + it.price * it.qty, 0);
      const disc = Math.min(Number(document.getElementById('edDiscount').value || 0), sub);
      return (sub - disc) * 1.05;
    }

    function renderEditPayments() {
      const host = document.getElementById('edPayRows');
      if (!editPayRows.length) {
        host.innerHTML = '<div class="muted fs-13">No payment recorded — the whole amount is due.</div>';
      } else {
        host.innerHTML = editPayRows.map((p, i) =>
          '<div class="d-flex gap-1 mb-1">' +
            '<select class="form-select form-select-sm ep-method" style="max-width:110px">' +
              ['CASH', 'CARD', 'OTHER', 'CREDIT'].map(m => '<option value="' + m + '"' + (p.method === m ? ' selected' : '') + '>' + m.charAt(0) + m.slice(1).toLowerCase() + '</option>').join('') +
            '</select>' +
            '<input class="form-control form-control-sm text-end ep-amt" type="number" min="0" step="0.001" value="' + p.amount + '">' +
            '<button class="btn btn-ghost btn-icon ep-del" type="button" data-i="' + i + '"><i class="bi bi-x-lg text-danger"></i></button>' +
          '</div>').join('');
      }
      updateEditPaidDue();
      host.querySelectorAll('.ep-amt').forEach((inp, i) => inp.addEventListener('input', () => { editPayRows[i].amount = Number(inp.value || 0); updateEditPaidDue(); }));
      host.querySelectorAll('.ep-method').forEach((sel, i) => sel.addEventListener('change', () => { editPayRows[i].method = sel.value; }));
      host.querySelectorAll('.ep-del').forEach(b => b.addEventListener('click', () => { editPayRows.splice(Number(b.dataset.i), 1); renderEditPayments(); }));
    }

    function updateEditPaidDue() {
      const total = editEffectiveTotal();
      const paid = editPaySum();
      const due = Math.max(0, total - paid);
      // mirror the split-row total into the amount box, but never fight the user mid-typing
      const ap = document.getElementById('edAmountPaid');
      if (ap && document.activeElement !== ap) ap.value = paid > 0 ? Math.round(paid * 1000) / 1000 : '';
      const tf = document.getElementById('edTotalForPay');
      if (tf) tf.textContent = EDY.fmt.money(total);
      document.getElementById('edPaid').textContent = EDY.fmt.money(paid);
      const d = document.getElementById('edDue');
      d.textContent = EDY.fmt.money(due);
      d.className = 'fw-semibold ' + (due > 0.001 ? 'text-red' : 'text-green');
      const note = document.getElementById('edDueNote');
      if (note) {
        if (paid > total + 0.001) note.innerHTML = 'Overpaid by ' + EDY.fmt.money(paid - total) + '.';
        else if (due > 0.001) note.innerHTML = 'Remaining ' + EDY.fmt.money(due) + ' stays unpaid \u2014 this sale is saved as <span class="fw-semibold text-red">Due</span>.';
        else if (paid > 0.001) note.innerHTML = 'Fully paid \u2014 this sale is saved as <span class="fw-semibold text-green">Paid</span>.';
        else note.textContent = 'No payment entered \u2014 the whole amount is due.';
      }
      syncStatusToPayment();
    }

    document.getElementById('edAddPay').addEventListener('click', () => {
      const total = editEffectiveTotal();
      const paid = editPayRows.reduce((s, p) => s + Number(p.amount || 0), 0);
      const remaining = Math.max(0, Math.round((total - paid) * 1000) / 1000);
      editPayRows.push({ method: 'CASH', amount: remaining });
      renderEditPayments();
    });
    document.getElementById('edPayFull').addEventListener('click', () => {
      editPayRows = [{ method: editPayMethod, amount: Math.round(editEffectiveTotal() * 1000) / 1000 }];
      renderEditPayments();
    });
    document.getElementById('edPayHalf').addEventListener('click', () => {
      const half = Math.round(editEffectiveTotal() * 500) / 1000;
      editPayRows = [{ method: editPayMethod, amount: half }];
      renderEditPayments();
    });
    // Typing here records money received against the selected payment method.
    // It never changes the invoice total, so the unentered part becomes balance due.
    document.getElementById('edAmountPaid').addEventListener('input', (e) => {
      const v = Math.max(0, Number(e.target.value || 0));
      editPayRows = v > 0 ? [{ method: editPayMethod, amount: Math.round(v * 1000) / 1000 }] : [];
      renderEditPayments();
    });

    function editProdSearch(q) {
      const box = document.getElementById('edProdResults');
      if (!q) { box.innerHTML = ''; return; }
      const ql = q.toLowerCase();
      const hits = allProducts.filter(p => (p.name + ' ' + (p.sku || '')).toLowerCase().includes(ql)).slice(0, 8);
      box.innerHTML = hits.map(p =>
        '<div class="d-flex align-items-center gap-2 p-1 px-2 rounded cursor-pointer ed-prod-pick" data-id="' + p.id + '" style="cursor:pointer">' +
        '<div class="text-primary"><i class="bi bi-box-seam"></i></div>' +
        '<div class="flex-grow-1 fs-13"><div class="fw-bold">' + esc(p.name) + '</div><div class="muted fs-11">' + esc(p.sku || '') + ' &middot; Stock: ' + p.quantityInStock + '</div></div>' +
        '<div class="fw-bold">' + EDY.fmt.money(p.unitPrice) + '</div></div>').join('');
      box.querySelectorAll('.ed-prod-pick').forEach(el => el.addEventListener('click', () => {
        const p = allProducts.find(x => x.id === Number(el.dataset.id));
        if (!p) return;
        const exist = editItems.find(it => it.productId === p.id);
        if (exist) { exist.qty++; } else {
          editItems.push({ productId: p.id, name: p.name, sku: p.sku, price: Number(p.unitPrice), qty: 1, stock: p.quantityInStock });
        }
        document.getElementById('edProdSearch').value = '';
        document.getElementById('edProdResults').innerHTML = '';
        renderEditItems();
      }));
    }
    document.getElementById('edProdSearch').addEventListener('input', (e) => editProdSearch(e.target.value));
    document.getElementById('edProdAdd').addEventListener('click', () => editProdSearch(document.getElementById('edProdSearch').value));

    // These three are money-driven: they are always recalculated from the amount
    // actually entered, so paying less than the total always shows up as a Due sale.
    const AUTO_STATUSES = ['PAID', 'DUE', 'CONFIRMED'];

    function editPaySum() {
      return editPayRows.reduce((s, p) => s + Number(p.amount || 0), 0);
    }

    function deriveStatus(total, paid) {
      if (paid <= 0.001) return 'CONFIRMED';
      if (total - paid <= 0.001) return 'PAID';
      return 'DUE';
    }

    // A deliberate pick of DRAFT / PENDING / CREDIT is kept; PAID / DUE / CONFIRMED
    // always follow the entered amount.
    function syncStatusToPayment() {
      const st = document.getElementById('edStatus');
      if (!st) return;
      if (edStatusTouched && AUTO_STATUSES.indexOf(st.value) === -1) return;
      st.value = deriveStatus(editEffectiveTotal(), editPaySum());
    }
    document.getElementById('edStatus').addEventListener('change', () => { edStatusTouched = true; });

    document.getElementById('edPay').querySelectorAll('.pay-btn').forEach(b => b.addEventListener('click', () => {
      document.getElementById('edPay').querySelectorAll('.pay-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); editPayMethod = b.dataset.pay;
      syncStatusToPayment();
    }));

    function editSale(id) {
      const inv = invoices.find(i => i.id === id);
      if (!inv || inv.status === 'CANCELLED') return;
      editInvId = id;
      editPayMethod = inv.paymentMethod || 'CASH';
      editItems = (inv.items || []).map(it => ({
        productId: it.product ? it.product.id : it.productId,
        name: (it.product && it.product.name) || it.productName || 'Product #' + (it.productId || ''),
        sku: (it.product && it.product.sku) || it.sku || '',
        price: Number(it.unitPrice),
        qty: it.quantity,
        stock: (it.product && it.product.quantityInStock != null) ? it.product.quantityInStock : it.quantity
      }));

      const sel = document.getElementById('edCust');
      sel.innerHTML = '<option value="">Walk-in Customer</option>' +
        customers.map(c => '<option value="' + c.id + '">' + esc(c.name) + (c.phone ? ' \u2014 ' + esc(c.phone) : '') + '</option>').join('');
      sel.value = inv.customer ? inv.customer.id : '';

      document.getElementById('edDiscount').value = inv.discount || 0;
      document.getElementById('edDate').value = inv.invoiceDate || '';

      // Preload the existing payment split (the amount box mirrors its total)
      editPayRows = (inv.payments || []).map(p => ({ method: p.method || 'CASH', amount: Number(p.amount || 0) }));
      const prePaid = editPaySum();
      document.getElementById('edAmountPaid').value = prePaid > 0 ? Math.round(prePaid * 1000) / 1000 : '';

      const stSel = document.getElementById('edStatus');
      stSel.value = inv.status || 'CONFIRMED';
      if (!stSel.value) stSel.value = 'CONFIRMED';
      // A deliberate Draft / Pending / Credit status is kept; money states re-derive below.
      edStatusTouched = AUTO_STATUSES.indexOf(stSel.value) === -1;

      document.getElementById('edPay').querySelectorAll('.pay-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.pay === editPayMethod);
      });

      renderEditItems();
      renderEditPayments();
      EDY.ui.openModal('editModal');
    }

    document.getElementById('edSave').addEventListener('click', async () => {
      if (!editItems.length) { EDY.ui.toast('Add at least one item', 'warning'); return; }
      const payments = editPayRows.filter(p => Number(p.amount) > 0).map(p => ({ method: p.method, amount: Number(p.amount) }));

      // The saved status always reflects the money, so entering less than the total
      // stores the remainder as balance due and marks the sale as Due.
      const effTotal = editEffectiveTotal();
      const paidSum = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
      if (paidSum > effTotal + 0.001) { EDY.ui.toast('Payment is more than the total ' + EDY.fmt.money(effTotal), 'error'); return; }
      const chosen = document.getElementById('edStatus').value;
      const status = AUTO_STATUSES.indexOf(chosen) === -1 ? chosen : deriveStatus(effTotal, paidSum);

      const payload = {
        customerId: document.getElementById('edCust').value || undefined,
        invoiceDate: document.getElementById('edDate').value || undefined,
        discount: Number(document.getElementById('edDiscount').value) || 0,
        paymentMethod: editPayMethod,
        payments,
        totalOverridden: false,
        status: status || undefined,
        items: editItems.map(it => ({ productId: it.productId, quantity: it.qty, unitPrice: it.price }))
      };
      try {
        const saved = await EDY.api.put('/api/sales-invoices/' + editInvId, payload);
        const idx = invoices.findIndex(i => i.id === editInvId);
        if (idx >= 0) invoices[idx] = saved;
        bootstrap.Modal.getInstance(editModal).hide();
        EDY.ui.toast('Sale ' + saved.invoiceNumber + ' updated');
        products = await EDY.api.get('/api/products').catch(() => products);
        render();
      } catch (err) { EDY.ui.toast(err.message, 'error'); }
    });

    [invoices, customers, products] = await Promise.all([
      EDY.api.get('/api/sales-invoices').catch(() => []),
      EDY.api.get('/api/customers').catch(() => []),
      EDY.api.get('/api/products').catch(() => [])
    ]);
    render();
  }
};