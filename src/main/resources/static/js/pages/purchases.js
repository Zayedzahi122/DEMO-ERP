/* EDY ERP — Purchases */
window.PAGE = {
  init: async function () {
    const box = document.getElementById('pageContent');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    let purchases = [], suppliers = [], products = [];
    let poLines = [];
    let table = null;

    box.innerHTML =
      '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">' +
      '<div><h1 class="page-title mb-1">Purchases</h1><div class="page-sub">Supplier purchase orders and stock-in history</div></div>' +
      '<button class="btn btn-primary" id="btnNew"><i class="bi bi-plus-lg me-1"></i>New Purchase</button>' +
      '</div>' +

      '<div class="row g-3 mb-4">' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value" id="kTotal">\u2014</div><div class="stat-label">Total Purchases</div></div></div></div>' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value text-green" id="kPaid">\u2014</div><div class="stat-label">Completed</div></div></div></div>' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value text-amber" id="kDraft">\u2014</div><div class="stat-label">Drafts</div></div></div></div>' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value text-blue" id="kVat">\u2014</div><div class="stat-label">VAT Paid</div></div></div></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-body">' +
      '<div class="d-flex flex-wrap gap-2 mb-3">' +
      '<div class="topbar-search" style="max-width:300px"><i class="bi bi-search"></i><input id="tblSearch" placeholder="Search order / supplier&hellip;"></div>' +
      '<select class="form-select w-auto" id="statusFilter"><option value="">All statuses</option><option value="COMPLETED">Completed</option><option value="DRAFT">Draft</option></select>' +
      '<button class="btn btn-ghost me-auto" id="btnImport"><i class="bi bi-upload me-1"></i>Import</button>' +
      '<button class="btn btn-ghost ms-auto" id="btnCsv"><i class="bi bi-download me-1"></i>CSV</button>' +
      '</div>' +
      '<div class="table-wrap"><table class="table" id="pTable"></table></div>' +
      '</div></div>';

    function calcPoTotal() {
      const sub = poLines.reduce((s, l) => s + l.qty * l.cost, 0);
      const t = EDY.vat.split(sub);
      document.getElementById('poSubtotal').textContent = EDY.fmt.money(sub);
      document.getElementById('poVat').textContent = EDY.fmt.money(t.tax);
      document.getElementById('poTotal').textContent = EDY.fmt.money(t.total);
    }

    function renderPoLines() {
      const host = document.getElementById('poLines');
      host.innerHTML = poLines.length
        ? poLines.map((l, i) => '<div class="d-flex align-items-center gap-2 border rounded p-2 mb-2">' +
            '<div class="flex-grow-1"><div class="fw-bold fs-13">' + esc(l.name) + '</div><div class="muted fs-12">' + EDY.fmt.num(l.qty) + ' \u00d7 ' + EDY.fmt.money(l.cost) + '</div></div>' +
            '<div class="fw-bold">' + EDY.fmt.money(l.qty * l.cost) + '</div>' +
            '<button class="btn btn-soft-danger btn-icon btn-sm" data-rm="' + i + '"><i class="bi bi-x"></i></button></div>').join('')
        : '<div class="empty-state py-3 muted">No items added yet.</div>';
      host.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { poLines.splice(Number(b.dataset.rm), 1); renderPoLines(); calcPoTotal(); }));
      calcPoTotal();
    }

    function statusBadge(s) {
      return s === 'COMPLETED' ? '<span class="badge bg-soft-green">Completed</span>'
        : s === 'CANCELLED' ? '<span class="badge bg-soft-red">Cancelled</span>'
        : '<span class="badge bg-soft-amber">' + (s || 'DRAFT') + '</span>';
    }

    function render() {
      let list = purchases;
      const sf = document.getElementById('statusFilter').value;
      if (sf) list = purchases.filter(p => p.status === sf);
      const total = purchases.filter(p => p.status !== 'CANCELLED').reduce((s, p) => s + calcTotal(p), 0);
      document.getElementById('kTotal').textContent = EDY.fmt.money(total);
      document.getElementById('kPaid').textContent = purchases.filter(p => p.status === 'COMPLETED').length;
      document.getElementById('kDraft').textContent = purchases.filter(p => !p.status || p.status === 'DRAFT').length;
      document.getElementById('kVat').textContent = EDY.fmt.money(purchases.filter(p => p.status !== 'CANCELLED').reduce((s, p) => s + calcVat(p), 0));

      table = EDY.ui.table({
        el: document.getElementById('pTable'),
        searchInput: document.getElementById('tblSearch'),
        data: list,
        pageSize: 12,
        columns: [
          { key: 'id', label: 'PO', render: (r) => '<span class="fw-bold">PO-' + EDY.fmt.num(r.id).padStart(4, '0') + '</span>' },
          { key: 'supplier', label: 'Supplier', render: (r) => r.supplier ? '<div class="fw-bold">' + esc(r.supplier.name) + '</div><div class="muted fs-12">' + esc(r.supplier.phone || '') + '</div>' : '\u2014' },
          { key: 'invoiceDate', label: 'Date', date: true },
          { key: 'items', label: 'Items', render: (r) => (r.items || []).reduce((s, it) => s + it.quantity, 0) + ' items' },
          { key: 'total', label: 'Total', render: (r) => EDY.fmt.money(calcTotal(r)) },
          { key: 'vat', label: 'VAT', render: (r) => EDY.fmt.money(calcVat(r)) },
          { key: 'paymentMethod', label: 'Payment', render: (r) => esc(r.paymentMethod || 'CASH') },
          { key: 'status', label: 'Status', render: (r) => statusBadge(r.status) },
          { key: 'id2', label: 'Actions', render: (r) => {
            let html = '<button class="btn btn-soft-primary btn-icon me-1" data-view="' + r.id + '" title="View"><i class="bi bi-eye"></i></button>';
            html += '<button class="btn btn-ghost btn-icon me-1" data-print="' + r.id + '" title="Preview and print"><i class="bi bi-printer"></i></button>';
            if (r.status === 'DRAFT' || !r.status) html += '<button class="btn btn-soft-green btn-icon me-1" data-complete="' + r.id + '" title="Complete"><i class="bi bi-check-circle"></i></button>';
            return html; } }
        ]
      });
      box.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => viewPO(Number(b.dataset.view))));
      box.querySelectorAll('[data-print]').forEach(b => b.addEventListener('click', () => printPO(Number(b.dataset.print))));
      box.querySelectorAll('[data-complete]').forEach(b => b.addEventListener('click', () => complete(Number(b.dataset.complete))));
    }

    /** The purchase as a document — A4 for the file, receipt if it travelled with the goods. */
    function printPO(id) {
      const po = purchases.find(x => x.id === id);
      if (!po) return;
      const doc = Object.assign({}, po, {
        invoiceNumber: po.invoiceNumber || ('PO-' + String(po.id).padStart(4, '0')),
        totalAmount: calcTotal(po),
        taxAmount: calcVat(po),
        subtotal: Number(po.subtotal) || (po.items || []).reduce((s, it) => s + (it.unitCost || 0) * it.quantity, 0)
      });
      EDY.print.preview({
        title: doc.invoiceNumber,
        subtitle: 'Purchase invoice \u00b7 ' + (po.invoiceDate || ''),
        formats: [
          { id: 'a4', label: 'A4 invoice' },
          { id: 'receipt', label: 'Receipt (80mm)' }
        ],
        build: (fmt) => EDY.print.invoice(doc, { type: 'purchase', format: fmt })
      });
    }

    /* A saved purchase carries its own subtotal/tax/total. Read those rather than
       recomputing from today's rate, which would silently rewrite history when
       the tax setting is changed later. */
    function calcTotal(po) {
      const stored = Number(po.totalAmount);
      if (Number.isFinite(stored)) return stored;
      return (po.items || []).reduce((s, it) => s + (it.unitCost || 0) * it.quantity, 0);
    }
    function calcVat(po) { return Number(po.taxAmount) || 0; }

    function viewPO(id) {
      const po = purchases.find(x => x.id === id);
      if (!po) return;
      EDY.ui.openModal('viewPOModal');
      const rows = (po.items || []).map(it =>
        '<tr><td>' + esc((it.product && it.product.name) || 'Product #' + it.productId) + '</td><td>' + it.quantity + '</td><td>' + EDY.fmt.money(it.unitCost) + '</td><td>' + EDY.fmt.money(it.unitCost * it.quantity) + '</td></tr>'
      ).join('') || '<tr><td colspan="4" class="muted text-center">No items</td></tr>';
      const sub = Number(po.subtotal) || 0;
      const vat = calcVat(po);
      const grand = calcTotal(po);
      document.getElementById('viewPOBody').innerHTML =
        '<div class="d-flex justify-content-between mb-3"><div class="fw-bold fs-5">PO-' + EDY.fmt.num(po.id).padStart(4, '0') + '</div>' + statusBadge(po.status) + '</div>' +
        '<div class="row mb-3"><div class="col-6"><div class="muted fs-12">Supplier</div><div class="fw-bold">' + esc(po.supplier ? po.supplier.name : '\u2014') + '</div></div>' +
        '<div class="col-3"><div class="muted fs-12">Date</div><div class="fw-bold">' + (po.invoiceDate || '\u2014') + '</div></div>' +
        '<div class="col-3"><div class="muted fs-12">Payment</div><div class="fw-bold">' + esc(po.paymentMethod || 'CASH') + '</div></div></div>' +
        '<table class="table"><thead><tr><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<div class="d-flex justify-content-between fw-bold mt-2"><span>Subtotal</span><span>' + EDY.fmt.money(sub) + '</span></div>' +
        (vat > 0 ? '<div class="d-flex justify-content-between muted"><span>VAT</span><span>' + EDY.fmt.money(vat) + '</span></div>' : '') +
        '<div class="d-flex justify-content-between fw-bold fs-5 border-top mt-2 pt-2"><span>Total</span><span>' + EDY.fmt.money(grand) + '</span></div>';
    }

    async function complete(id) {
      const ok = await EDY.ui.confirm('Complete this purchase order?', 'Stock will be added to inventory and VAT recorded.');
      if (!ok) return;
      try {
        await EDY.api.post('/api/purchase-invoices/' + id + '/complete', {});
        EDY.ui.toast('Order completed \u2014 stock updated');
        purchases = await EDY.api.get('/api/purchase-invoices');
        render();
      } catch (e) { EDY.ui.toast(e.message, 'error'); }
    }

    function initPoModal() {
      const sel = document.getElementById('poSupplier');
      sel.innerHTML = '<option value="">Select supplier</option>' + suppliers.map(s => '<option value="' + s.id + '">' + esc(s.name) + '</option>').join('');
      const prodSel = document.getElementById('poProduct');
      prodSel.innerHTML = products.map(p => '<option value="' + p.id + '" data-cost="' + p.costPrice + '">' + esc(p.name) + ' \u2014 ' + EDY.fmt.money(p.costPrice) + '</option>').join('');
      document.getElementById('poDate').value = new Date().toISOString().slice(0, 10);
      poLines = [];
      renderPoLines();
    }

    document.getElementById('btnNew').addEventListener('click', () => { initPoModal(); EDY.ui.openModal('poModal'); });
    document.getElementById('poAddLine').addEventListener('click', () => {
      const opt = document.getElementById('poProduct').selectedOptions[0];
      if (!opt) return;
      const pid = Number(opt.value);
      const name = opt.textContent.split('\u2014')[0].trim();
      const cost = Number(opt.dataset.cost);
      const qty = Number(document.getElementById('poQty').value) || 1;
      const existing = poLines.find(l => l.productId === pid);
      if (existing) { existing.qty += qty; existing.cost = cost; }
      else poLines.push({ productId: pid, name, qty, cost });
      renderPoLines();
    });
    document.getElementById('statusFilter').addEventListener('change', render);

    document.getElementById('poSave').addEventListener('click', async () => {
      const supplierId = Number(document.getElementById('poSupplier').value);
      if (!supplierId || !poLines.length) { EDY.ui.toast('Select supplier and add at least one item', 'warning'); return; }
      const payload = {
        supplierId,
        invoiceDate: document.getElementById('poDate').value || undefined,
        paymentMethod: document.getElementById('poPayment').value,
        items: poLines.map(l => ({ productId: l.productId, quantity: l.qty, unitCost: l.cost }))
      };
      try {
        await EDY.api.post('/api/purchase-invoices', payload);
        EDY.ui.closeModal('poModal');
        EDY.ui.toast('Purchase order created');
        purchases = await EDY.api.get('/api/purchase-invoices');
        render();
      } catch (e) { EDY.ui.toast(e.message, 'error'); }
    });

    document.getElementById('btnCsv').addEventListener('click', () => {
      const head = 'PO,Supplier,Date,Items,Subtotal,VAT,Total,Payment,Status';
      const rows = purchases.map(p => ['PO-' + String(p.id).padStart(4, '0'), (p.supplier ? p.supplier.name : ''), p.invoiceDate, (p.items || []).reduce((s, it) => s + it.quantity, 0), EDY.fmt.amount(p.subtotal || 0), EDY.fmt.amount(calcVat(p)), EDY.fmt.amount(calcTotal(p)), p.paymentMethod || '', p.status || 'DRAFT']
        .map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','));
      const blob = new Blob(['\ufeff' + head + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'purchases.csv'; a.click();
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
          else if (ch === '"') inQ = true;
          else if (ch === ',') { out.push(cur); cur = ''; }
          else cur += ch;
        }
        out.push(cur); return out;
      };
      const idx = (h) => lines[0].split(',').map(x => x.replace(/"/g, '').toLowerCase()).indexOf(h);
      const iRef = Math.max(idx('po'), idx('reference'), idx('purchaseorder'), 0);
      const iDate = idx('date'), iSupp = idx('supplier'), iSku = idx('sku'), iQty = idx('quantity'), iCost = idx('unitcost'), iPay = idx('payment');
      if (iSku < 0) { EDY.ui.toast('CSV needs a "SKU" column (import format: PO,Date,Supplier,SKU,Quantity,UnitCost,Payment)', 'error'); e.target.value = ''; return; }

      const groups = {};
      for (const line of lines.slice(1)) {
        const c = parse(line);
        const sku = (c[iSku] || '').trim();
        if (!sku) continue;
        const ref = (c[iRef] || '').trim() || ((c[iDate] || '') + '|' + (c[iSupp] || ''));
        groups[ref] = groups[ref] || { date: c[iDate] || '', supplier: (c[iSupp] || '').trim(), pay: c[iPay] || 'PAID', items: [] };
        groups[ref].items.push({ sku: sku, qty: Number(c[iQty]) || 1, cost: iCost >= 0 && c[iCost] !== '' ? Number(c[iCost]) : null });
      }

      const findSku = (sku) => (products.find(p => String(p.sku || '').toLowerCase() === sku.toLowerCase()));
      const findSupp = (name) => (suppliers.find(s => String(s.name || '').toLowerCase() === name.toLowerCase()));

      let ok = 0, fail = 0, rc = 0;
      for (const key in groups) {
        const g = groups[key];
        const skuItems = g.items.map(it => ({ ...it, prod: findSku(it.sku) }));
        if (skuItems.some(it => !it.prod)) { fail++; continue; }
        try {
          let supp = null;
          if (g.supplier) {
            supp = findSupp(g.supplier);
            if (!supp) { supp = await EDY.api.post('/api/suppliers', { name: g.supplier }); suppliers.push(supp); rc++; }
          }
          if (!supp) { fail++; continue; }
          await EDY.api.post('/api/purchase-invoices', {
            supplierId: supp.id,
            invoiceDate: g.date || undefined,
            paymentStatus: g.pay || 'PAID',
            items: skuItems.map(it => ({ productId: it.prod.id, quantity: it.qty, unitCost: it.cost || undefined }))
          });
          ok++;
        } catch (err) { fail++; }
      }
      e.target.value = '';
      EDY.ui.toast((ok ? ok + ' purchase orders imported' : '') + (rc ? ' (' + rc + ' suppliers created)' : '') + (fail ? ', ' + fail + ' failed' : ''), fail ? 'warning' : 'success');
      purchases = await EDY.api.get('/api/purchase-invoices');
      render();
    });

    const vm = document.createElement('div');
    vm.className = 'modal fade'; vm.id = 'viewPOModal';
    vm.innerHTML = '<div class="modal-dialog modal-dialog-centered modal-lg"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">Purchase Order</h5><button class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body" id="viewPOBody"></div></div></div>';
    document.body.appendChild(vm);

    [purchases, suppliers, products] = await Promise.all([
      EDY.api.get('/api/purchase-invoices').catch(() => []),
      EDY.api.get('/api/suppliers').catch(() => []),
      EDY.api.get('/api/products').catch(() => [])
    ]);
    render();
    if (new URLSearchParams(location.search).get('new')) { initPoModal(); EDY.ui.openModal('poModal'); }
  }
};