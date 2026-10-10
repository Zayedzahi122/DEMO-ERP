/* EDY ERP — Inventory (Stock) */
window.PAGE = {
  init: async function () {
    const box = document.getElementById('pageContent');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    let products = [];
    let movements = [];

    box.innerHTML =
      '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">' +
      '<div><h1 class="page-title mb-1">Inventory / Stock</h1><div class="page-sub">Stock levels, movements and adjustments</div></div>' +
      '<button class="btn btn-primary" id="btnAdj"><i class="bi bi-sliders me-1"></i>Adjust Stock</button>' +
      '</div>' +

      '<div class="row g-3 mb-4" id="kpis">' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value" id="kValu">\u2014</div><div class="stat-label">Stock Value</div></div></div></div>' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value text-green" id="kUnits">\u2014</div><div class="stat-label">Total Units</div></div></div></div>' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value text-red" id="kOut">\u2014</div><div class="stat-label">Out of Stock</div></div></div></div>' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value text-amber" id="kLow">\u2014</div><div class="stat-label">Low Stock</div></div></div></div>' +
      '</div>' +

      '<div class="card mb-4">' +
      '<div class="card-header"><span>Stock Levels</span><div class="toolbar">' +
      '<select class="form-select form-select-sm w-auto" id="stateFilter"><option value="">All</option><option value="out">Out of stock</option><option value="low">Low stock</option></select>' +
      '<button class="btn btn-ghost btn-sm" id="btnStockCsv"><i class="bi bi-download me-1"></i>CSV</button></div></div>' +
      '<div class="card-body table-wrap"><table class="table" id="stockTable"></table></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-header"><span>Stock Movement History</span><button class="btn btn-ghost btn-sm" id="btnMovCsv"><i class="bi bi-download me-1"></i>CSV</button></div>' +
      '<div class="card-body table-wrap"><table class="table" id="movTable"></table></div>' +
      '</div>';

    function stockBadge(p) {
      if (p.quantityInStock <= 0) return '<span class="badge bg-soft-red">Out of stock</span>';
      if (p.quantityInStock <= (p.reorderLevel || 0)) return '<span class="badge bg-soft-amber">Low</span>';
      return '<span class="badge bg-soft-green">In stock</span>';
    }

    let stockTable = null, movTable = null;

    function render() {
      const totalUnits = products.reduce((s, p) => s + p.quantityInStock, 0);
      const totalValue = products.reduce((s, p) => s + p.quantityInStock * (p.costPrice || 0), 0);
      document.getElementById('kValu').textContent = EDY.fmt.money(totalValue);
      document.getElementById('kUnits').textContent = EDY.fmt.num(totalUnits);
      document.getElementById('kOut').textContent = products.filter(p => p.quantityInStock <= 0).length;
      document.getElementById('kLow').textContent = products.filter(p => p.quantityInStock > 0 && p.quantityInStock <= (p.reorderLevel || 0)).length;

      stockTable = EDY.ui.table({
        el: document.getElementById('stockTable'),
        data: products,
        pageSize: 10,
        columns: [
          { key: 'name', label: 'Product', render: (r) => '<div class="fw-bold">' + esc(r.name) + '</div><div class="muted fs-12">' + esc(r.sku || '') + '</div>' },
          { key: 'category', label: 'Category', render: (r) => r.category ? esc(r.category.name) : '\u2014' },
          { key: 'quantityInStock', label: 'Stock', render: (r) => '<span class="fw-bold ' + (r.quantityInStock <= 0 ? 'text-danger' : '') + '">' + EDY.fmt.num(r.quantityInStock) + '</span>' },
          { key: 'reorderLevel', label: 'Min', render: (r) => EDY.fmt.num(r.reorderLevel || 0) },
          { key: 'status', label: 'Status', render: (r) => stockBadge(r) },
          { key: 'id', label: 'Actions', render: (r) =>
            '<button class="btn btn-soft-primary btn-icon me-1" data-adj="' + r.id + '" title="Adjust"><i class="bi bi-sliders"></i></button>' +
            '<button class="btn btn-ghost btn-icon" data-print="' + r.id + '" title="Preview and print"><i class="bi bi-printer"></i></button>' }
        ]
      });
      box.querySelectorAll('[data-adj]').forEach(b => b.addEventListener('click', () => openAdjust(Number(b.dataset.adj))));
      box.querySelectorAll('[data-print]').forEach(b => b.addEventListener('click', () => printStockCard(Number(b.dataset.print))));

      movTable = EDY.ui.table({
        el: document.getElementById('movTable'),
        data: movements,
        pageSize: 10,
        columns: [
          { key: 'timestamp', label: 'When', datetime: true },
          { key: 'product', label: 'Product', render: (r) => r.productName || r.product ? (r.product.name || '') : '\u2014' },
          { key: 'type', label: 'Type', render: (r) => r.type === 'IN' ? '<span class="badge bg-soft-green">Stock In</span>' : '<span class="badge bg-soft-red">Stock Out</span>' },
          { key: 'quantity', label: 'Qty', render: (r) => '<span class="fw-bold ' + (r.type === 'IN' ? 'text-success' : 'text-danger') + '">' + (r.type === 'IN' ? '+' : '\u2212') + EDY.fmt.num(r.quantity) + '</span>' },
          { key: 'reason', label: 'Reason', render: (r) => esc(r.reason || r.note || '\u2014') }
        ],
        emptyText: 'No stock movements yet. Sales, purchases and adjustments will appear here.'
      });

      document.getElementById('stateFilter').onchange = () => {
        const v = document.getElementById('stateFilter').value;
        let list = products;
        if (v === 'out') list = products.filter(p => p.quantityInStock <= 0);
        if (v === 'low') list = products.filter(p => p.quantityInStock <= (p.reorderLevel || 0));
        stockTable.refresh(list);
      };
    }

    function exportCsv(file, data, head, renderRow) {
      const rows = data.map(renderRow);
      const blob = new Blob(['\ufeff' + head + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file; a.click();
    }
    document.getElementById('btnStockCsv').addEventListener('click', () =>
      exportCsv('stock.csv', products, 'SKU,Name,Category,Stock,Min,CostPrice,UnitPrice',
        p => [p.sku, p.name, (p.category ? p.category.name : ''), p.quantityInStock, p.reorderLevel || 0, p.costPrice, p.unitPrice].map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')));
    document.getElementById('btnMovCsv').addEventListener('click', () =>
      exportCsv('movements.csv', movements, 'Date,Product,Type,Quantity,Reason',
        m => [m.timestamp, (m.productName || (m.product ? m.product.name : '') || ''), m.type, m.quantity, (m.reason || m.note || '')].map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')));

    /**
     * A stock card: where one product stands today and how it got there. The
     * movement history is included because "who moved 12 units and why" is the
     * question this screen exists to answer, and a printed card without it would
     * only restate the quantity.
     */
    function printStockCard(id) {
      const p = products.find(x => x.id === id);
      if (!p) return;
      const qty = Number(p.quantityInStock || 0);
      const mine = movements.filter(m =>
        (m.productId === id) || (m.product && m.product.id === id) ||
        (m.productName && m.productName === p.name)
      ).sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
      const history = EDY.print.list('Movements', [
        { label: 'When' },
        { label: 'Type', align: 'c' },
        { label: 'Qty', align: 'r' },
        { label: 'Reason' }
      ], mine.map(m => [
        esc(String(m.timestamp || '').replace('T', ' ').slice(0, 16)),
        m.type === 'IN' ? 'Stock in' : 'Stock out',
        esc((m.type === 'IN' ? '+' : '\u2212') + EDY.fmt.num(m.quantity)),
        esc(m.reason || m.note || '\u2014')
      ]), { bare: true });

      EDY.print.preview({
        title: p.name,
        subtitle: 'Stock card \u00b7 ' + (p.sku || 'no SKU'),
        html: EDY.print.record('Stock card', p.sku || '', [
          ['SKU', p.sku || '\u2014'],
          ['Name', p.name],
          ['Category', p.category ? p.category.name : '\u2014'],
          ['Quantity on hand', EDY.fmt.num(qty)],
          ['Reorder level', EDY.fmt.num(p.reorderLevel || 0)],
          ['Cost price', EDY.fmt.money(p.costPrice)],
          ['Value at cost', EDY.fmt.money(qty * Number(p.costPrice || 0))],
          ['Status', qty <= 0 ? 'Out of stock' : (qty <= Number(p.reorderLevel || 0) ? 'Low stock' : 'In stock')]
        ], {
          bodyLabel: 'Movement history',
          body: mine.length ? history
            : '<div style="font-size:12px;color:#64748b">No stock movements yet.</div>'
        })
      });
    }

    function openAdjust(id) {
      const p = products.find(x => x.id === id);
      const sel = document.getElementById('adjProduct');
      sel.innerHTML = products.map(x => '<option value="' + x.id + '"' + (x.id === id ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('');
      document.getElementById('adjCurrent').value = p ? p.quantityInStock : '';
      document.getElementById('adjQty').value = '';
      document.getElementById('adjNote').value = '';
      EDY.ui.openModal('adjustModal');
    }

    document.getElementById('btnAdj').addEventListener('click', () => {
      const sel = document.getElementById('adjProduct');
      sel.innerHTML = products.map(x => '<option value="' + x.id + '">' + esc(x.name) + '</option>').join('');
      document.getElementById('adjCurrent').value = '';
      document.getElementById('adjQty').value = '';
      document.getElementById('adjNote').value = '';
      EDY.ui.openModal('adjustModal');
    });
    document.getElementById('adjProduct').addEventListener('change', () => {
      const p = products.find(x => x.id === Number(document.getElementById('adjProduct').value));
      document.getElementById('adjCurrent').value = p ? p.quantityInStock : '';
    });

    document.getElementById('adjSave').addEventListener('click', async () => {
      const pid = Number(document.getElementById('adjProduct').value);
      const delta = Number(document.getElementById('adjQty').value);
      const note = document.getElementById('adjNote').value.trim();
      if (!pid || !delta || !isFinite(delta)) { EDY.ui.toast('Choose a product and enter a non-zero adjustment', 'warning'); return; }
      try {
        await EDY.api.post('/api/products/' + pid + '/adjust', { delta, note: note || 'Manual adjustment' });
        EDY.ui.closeModal('adjustModal');
        EDY.ui.toast('Stock adjusted');
        products = await EDY.api.get('/api/products');
        movements = await EDY.api.get('/api/stock-movements').catch(() => []);
        render();
      } catch (e) { EDY.ui.toast(e.message, 'error'); }
    });

    products = await EDY.api.get('/api/products').catch(() => []);
    movements = await EDY.api.get('/api/stock-movements').catch(() => []);
    render();

    const q = new URLSearchParams(location.search).get('adjust');
    if (q) openAdjust(Number(q));
  }
};