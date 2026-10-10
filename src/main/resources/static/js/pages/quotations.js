/* EDY ERP — Quotations */
window.PAGE = {
  init: async function () {
    const box = document.getElementById('pageContent');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const money = (v) => EDY.fmt.money(v);
const amt = (v) => EDY.fmt.amount(v);          // same scale, no currency label
const vatRate = () => EDY.vat.rate();
const vatPct = () => EDY.vat.pct();

    let quotations = [];
    let customers = [];
    let products = [];
    let qLines = [];
    let currentViewId = null;

    function statusBadge(s) {
      const map = {
        DRAFT: '<span class="badge bg-soft-gray">Draft</span>',
        SENT: '<span class="badge bg-soft-blue">Sent</span>',
        ACCEPTED: '<span class="badge bg-soft-green">Accepted</span>',
        CONVERTED: '<span class="badge bg-soft-purple">Converted</span>',
        CANCELLED: '<span class="badge bg-soft-red">Cancelled</span>'
      };
      return map[s] || '<span class="badge bg-soft-gray">' + esc(s) + '</span>';
    }

    box.innerHTML =
      '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">' +
      '<div><h1 class="page-title mb-1">Quotations</h1><div class="page-sub">Send quotes and convert them into sales</div></div>' +
      '<button class="btn btn-primary" id="btnAdd"><i class="bi bi-file-earmark-plus me-1"></i>Add Quotation</button>' +
      '</div>' +

      '<div class="row g-3 mb-4">' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value" id="kCount">\u2014</div><div class="stat-label">Total Quotations</div></div></div></div>' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value text-blue" id="kPending">\u2014</div><div class="stat-label">Open (Draft / Sent)</div></div></div></div>' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value text-green" id="kConverted">\u2014</div><div class="stat-label">Converted Value</div></div></div></div>' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value text-red" id="kExpired">\u2014</div><div class="stat-label">Expired</div></div></div></div>' +
      '</div>' +

      '<div class="card"><div class="card-body">' +
      '<div class="d-flex flex-wrap gap-2 mb-3">' +
      '<div class="topbar-search" style="max-width:300px"><i class="bi bi-search"></i><input id="tblSearch" placeholder="Search quotation / customer&hellip;"></div>' +
      '<select class="form-select w-auto" id="statusFilter"><option value="">All statuses</option><option>DRAFT</option><option>SENT</option><option>ACCEPTED</option><option>CONVERTED</option><option>CANCELLED</option></select>' +
      '</div>' +
      '<div class="table-wrap"><table class="table" id="qTable"></table></div>' +
      '</div></div>';

    function render() {
      const sf = document.getElementById('statusFilter').value;
      const today = new Date().toISOString().slice(0, 10);
      let list = quotations;
      if (sf) list = list.filter(q => q.status === sf);

      document.getElementById('kCount').textContent = quotations.length;
      document.getElementById('kPending').textContent = quotations.filter(q => q.status === 'DRAFT' || q.status === 'SENT').length;
      document.getElementById('kConverted').textContent = money(quotations.filter(q => q.status === 'CONVERTED').reduce((s, q) => s + Number(q.totalAmount || 0), 0));
      document.getElementById('kExpired').textContent = quotations.filter(q => q.validUntil && q.status !== 'CONVERTED' && q.status !== 'CANCELLED' && q.validUntil < today).length;

      EDY.ui.table({
        el: document.getElementById('qTable'),
        searchInput: document.getElementById('tblSearch'),
        searchKeys: ['quotationNumber', 'customer'],
        data: list,
        pageSize: 12,
        columns: [
          { key: 'quotationNumber', label: 'Quote', render: (r) => '<span class="fw-bold">' + esc(r.quotationNumber) + '</span>' },
          { key: 'customer', label: 'Customer', render: (r) => r.customer ? esc(r.customer.name) : '\u2014' },
          { key: 'quotationDate', label: 'Date', render: (r) => esc(r.quotationDate || '\u2014') },
          { key: 'validUntil', label: 'Valid Until', render: (r) => esc(r.validUntil || '\u2014') },
          { key: 'status', label: 'Status', render: (r) => statusBadge(r.status) },
          { key: 'totalAmount', label: 'Total', money: true, className: 'fw-bold' },
          { key: 'id', label: 'Actions', render: (r) =>
            '<div class="dropdown">' +
            '<button class="btn btn-primary btn-sm dropdown-toggle" data-bs-toggle="dropdown">Actions</button>' +
            '<ul class="dropdown-menu dropdown-menu-end">' +
            '<li><a class="dropdown-item" href="#" data-view="' + r.id + '"><i class="bi bi-eye me-2"></i>View</a></li>' +
            '<li><a class="dropdown-item" href="#" data-print="' + r.id + '"><i class="bi bi-printer me-2"></i>Print</a></li>' +
            (r.status !== 'CONVERTED' ? '<li><a class="dropdown-item" href="#" data-convert="' + r.id + '"><i class="bi bi-arrow-right-circle me-2"></i>Convert to Sale</a></li>' : '') +
            '<li><hr class="dropdown-divider"></li>' +
            '<li><a class="dropdown-item text-danger" href="#" data-del="' + r.id + '"><i class="bi bi-trash me-2"></i>Delete</a></li>' +
            '</ul></div>' }
        ],
        emptyText: 'No quotations yet. Click "Add Quotation" to create your first one.'
      });
    }

    document.getElementById('qTable').addEventListener('click', function (e) {
      const v = e.target.closest('[data-view]');
      const cv = e.target.closest('[data-convert]');
      const dl = e.target.closest('[data-del]');
      const pr = e.target.closest('[data-print]');
      if (v) { e.preventDefault(); openView(Number(v.dataset.view)); }
      else if (pr) { e.preventDefault(); printQuo(Number(pr.dataset.print)); }
      else if (cv) { e.preventDefault(); convert(Number(cv.dataset.convert)); }
      else if (dl) { e.preventDefault(); remove(Number(dl.dataset.del)); }
    });

    /**
     * Quotations used to open a second page that printed on arrival, which gave the
     * reader no chance to see what would come out. The preview is the same document,
     * now shown first.
     */
    function printQuo(id) {
      const q = quotations.find(x => x.id === id);
      if (!q) return;
      EDY.print.preview({
        title: q.quotationNumber,
        subtitle: 'Quotation \u00b7 valid until ' + (q.validUntil || '\u2014'),
        formats: [
          { id: 'a4', label: 'A4 quotation' },
          { id: 'receipt', label: 'Receipt (80mm)' }
        ],
        build: (fmt) => EDY.print.invoice(q, { type: 'quotation', format: fmt })
      });
    }

    /* ---------- Add / edit quotation ---------- */
    function fillCustomerSel() {
      const sel = document.getElementById('qCustomer');
      sel.innerHTML = '<option value="">Select customer</option>' + customers.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('');
    }
    function fillProductSel() {
      const sel = document.getElementById('qProduct');
      sel.innerHTML = products.map(p => '<option value="' + p.id + '" data-price="' + p.unitPrice + '">' + esc(p.name) + ' \u2014 ' + esc(p.sku) + ' ' + money(p.unitPrice) + '</option>').join('');
    }

    function calcQuoteTotals() {
      const st = qLines.reduce((s, l) => s + l.price * l.qty, 0);
      const disc = Number(document.getElementById('qDiscount').value) || 0;
      const t = EDY.vat.split(st - disc);
      document.getElementById('qstSubtotal').textContent = amt(st);
      document.getElementById('qstVat').textContent = amt(t.tax);
      document.getElementById('qstTotal').textContent = amt(t.total);
    }

    function renderLines() {
      document.querySelector('#qLines tbody').innerHTML = qLines.map((l, i) =>
        '<tr><td class="fw-bold">' + esc(l.name) + '</td><td class="text-center">' + l.qty + '</td><td class="text-end">' + amt(l.price) + '</td><td class="text-end">' + amt(l.price * l.qty) + '</td>' +
        '<td class="text-end"><button class="btn btn-soft-danger btn-icon btn-sm" data-qrm="' + i + '" title="Remove"><i class="bi bi-x-lg"></i></button></td></tr>'
      ).join('') || '<tr><td colspan="5" class="muted text-center">No items yet</td></tr>';
      document.querySelectorAll('[data-qrm]').forEach(b => b.addEventListener('click', () => { qLines.splice(Number(b.dataset.qrm), 1); renderLines(); calcQuoteTotals(); }));
    }

    function openAdd() {
      fillCustomerSel(); fillProductSel();
      document.getElementById('qCustomer').value = '';
      document.getElementById('qDate').value = new Date().toISOString().slice(0, 10);
      document.getElementById('qValid').value = '';
      document.getElementById('qDiscount').value = '0';
      document.getElementById('qNotes').value = '';
      document.getElementById('qQty').value = '1';
      qLines = [];
      renderLines(); calcQuoteTotals();
      EDY.ui.openModal('qModal');
    }

    document.getElementById('qProduct').addEventListener('change', (e) => {
      const opt = e.target.selectedOptions[0];
      document.getElementById('qPrice').value = opt ? opt.dataset.price : '';
    });
    document.getElementById('qAddLine').addEventListener('click', () => {
      const opt = document.getElementById('qProduct').selectedOptions[0];
      if (!opt) return;
      const pid = Number(opt.value);
      const name = opt.textContent.split(' \u2014')[0].trim();
      const qty = Number(document.getElementById('qQty').value) || 1;
      const price = Number(document.getElementById('qPrice').value);
      if (!price || price < 0) { EDY.ui.toast('Enter a unit price', 'warning'); return; }
      const existing = qLines.find(l => l.productId === pid);
      if (existing) { existing.qty += qty; existing.price = price; }
      else qLines.push({ productId: pid, name: name, qty: qty, price: price });
      renderLines(); calcQuoteTotals();
    });

    document.getElementById('qForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const customerId = Number(document.getElementById('qCustomer').value);
      if (!customerId || !qLines.length) { EDY.ui.toast('Select a customer and add at least one item', 'warning'); return; }
      const payload = {
        customerId,
        quotationDate: document.getElementById('qDate').value || undefined,
        validUntil: document.getElementById('qValid').value || undefined,
        discount: Number(document.getElementById('qDiscount').value) || 0,
        notes: document.getElementById('qNotes').value.trim() || null,
        items: qLines.map(l => ({ productId: l.productId, quantity: l.qty, unitPrice: l.price }))
      };
      try {
        await EDY.api.post('/api/quotations', payload);
        EDY.ui.closeModal('qModal');
        EDY.ui.toast('Quotation created');
        quotations = await EDY.api.get('/api/quotations');
        render();
      } catch (err) { EDY.ui.toast(err.message, 'error'); }
    });

    /* ---------- View / convert / delete ---------- */
    function openView(id) {
      currentViewId = id;
      const q = quotations.find(x => x.id === id);
      if (!q) return;
      const row = (label, val) => '<div class="d-flex justify-content-between border-bottom py-2 gap-3"><span class="muted">' + label + '</span><span class="fw-semibold text-end">' + val + '</span></div>';
      document.getElementById('qvTitle').textContent = q.quotationNumber;
      document.getElementById('qvBody').innerHTML =
        '<div class="row mb-3"><div class="col-6">' +
        row('Customer', q.customer ? esc(q.customer.name) : '\u2014') +
        (q.customer && q.customer.phone ? row('Phone', esc(q.customer.phone)) : '') +
        '</div><div class="col-6">' +
        row('Date', esc(q.quotationDate || '\u2014')) +
        row('Valid Until', esc(q.validUntil || '\u2014')) +
        row('Status', statusBadge(q.status)) +
        '</div></div>' +
        (q.notes ? '<div class="p-2 rounded bg-soft-gray fs-13 mb-3">' + esc(q.notes) + '</div>' : '') +
        '<table class="table"><thead><tr><th>Item</th><th class="text-center">Qty</th><th class="text-end">Price</th><th class="text-end">Total</th></tr></thead><tbody>' +
        (q.items || []).map(it =>
          '<tr><td class="fw-bold">' + esc((it.product && it.product.name) || 'Product #' + it.productId) + '</td><td class="text-center">' + it.quantity + '</td><td class="text-end">' + amt(it.unitPrice) + '</td><td class="text-end">' + amt(it.lineTotal) + '</td></tr>'
        ).join('') +
        '</tbody></table>' +
        '<div class="row fs-14">' +
        '<div class="col-6 offset-4 text-end muted">Subtotal</div><div class="col-2 text-end">' + amt(q.subtotal) + '</div>' +
        (Number(q.discount || 0) > 0 ? '<div class="col-6 offset-4 text-end muted">Discount</div><div class="col-2 text-end text-red">\u2212' + amt(q.discount) + '</div>' : '') +
        (Number(q.taxAmount) > 0 ? '<div class="col-6 offset-4 text-end muted">VAT</div><div class="col-2 text-end">' + amt(q.taxAmount) + '</div>' : '') +
        '<div class="col-6 offset-4 text-end fw-bold">Total</div><div class="col-2 text-end fw-bold fs-5">' + amt(q.totalAmount) + '</div>' +
        '</div>';
      const btnConvert = document.getElementById('qvConvert');
      btnConvert.style.display = q.status === 'CONVERTED' ? 'none' : '';
      EDY.ui.openModal('qViewModal');
    }

    document.getElementById('qvPrint').addEventListener('click', () => {
      if (currentViewId) window.open('/invoice?type=quotation&id=' + currentViewId, '_blank');
    });
    document.getElementById('qvConvert').addEventListener('click', async () => {
      if (!currentViewId) return;
      try {
        const inv = await EDY.api.post('/api/quotations/' + currentViewId + '/convert', {});
        EDY.ui.toast('Converted to ' + inv.invoiceNumber);
        EDY.ui.closeModal('qViewModal');
        quotations = await EDY.api.get('/api/quotations');
        render();
      } catch (e) { EDY.ui.toast(e.message, 'error'); }
    });

    async function convert(id) {
      const q = quotations.find(x => x.id === id);
      const ok = await EDY.ui.confirm('Convert to sale?', 'Create a sales invoice from ' + q.quotationNumber + '? Stock will be deducted.');
      if (!ok) return;
      try {
        const inv = await EDY.api.post('/api/quotations/' + id + '/convert', {});
        EDY.ui.toast('Converted to ' + inv.invoiceNumber);
        quotations = await EDY.api.get('/api/quotations');
        render();
      } catch (e) { EDY.ui.toast(e.message, 'error'); }
    }

    async function remove(id) {
      const q = quotations.find(x => x.id === id);
      const ok = await EDY.ui.confirm('Delete quotation?', 'Delete ' + q.quotationNumber + '? This cannot be undone.');
      if (!ok) return;
      try {
        await EDY.api.del('/api/quotations/' + id);
        quotations = quotations.filter(x => x.id !== id);
        render();
        EDY.ui.toast('Quotation deleted');
      } catch (e) { EDY.ui.toast(e.message, 'error'); }
    }

    document.getElementById('btnAdd').addEventListener('click', openAdd);
    document.getElementById('statusFilter').addEventListener('change', render);

    [quotations, customers, products] = await Promise.all([
      EDY.api.get('/api/quotations').catch(() => []),
      EDY.api.get('/api/customers').catch(() => []),
      EDY.api.get('/api/products').catch(() => [])
    ]);
    render();

    if (new URLSearchParams(location.search).get('new')) openAdd();
  }
};