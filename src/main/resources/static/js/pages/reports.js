/* EDY ERP â€” Reports (21 reports, grouped by module) */
window.PAGE = {
  init: async function () {
    const box = document.getElementById('pageContent');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const today = new Date().toISOString().slice(0, 10);
    const todayDate = new Date();

    /* ---------- data ---------- */
    let sales = [], purchases = [], products = [], customers = [], suppliers = [], users = [], cats = [], ledger = [], movements = [];
    [sales, purchases, products, customers, suppliers, users, cats, ledger, movements] = await Promise.all([
      EDY.api.get('/api/sales-invoices').catch(() => []),
      EDY.api.get('/api/purchase-invoices').catch(() => []),
      EDY.api.get('/api/products').catch(() => []),
      EDY.api.get('/api/customers').catch(() => []),
      EDY.api.get('/api/suppliers').catch(() => []),
      EDY.api.get('/api/users').catch(() => []),
      EDY.api.get('/api/categories').catch(() => []),
      EDY.api.get('/api/ledger').catch(() => []),
      EDY.api.get('/api/stock-movements').catch(() => [])
    ]);
    const pm = {};
    products.forEach(p => pm[p.id] = p);
    const catMap = {};
    cats.forEach(c => catMap[c.id] = c);
    const customerMap = {};
    customers.forEach(c => customerMap[c.id] = c);
    const supplierMap = {};
    suppliers.forEach(s => supplierMap[s.id] = s);
    const pname = (ref) => {
      if (!ref) return '\u2014';
      if (ref.name) return ref.name;
      return pm[ref.id] ? pm[ref.id].name : (ref.sku || ('#' + ref.id));
    };

    /* ---------- period ---------- */
    let periodDays = 30;
    function startDate() { const d = new Date(); d.setDate(d.getDate() - periodDays); return d; }
    function inRange(dateStr) { return periodDays ? new Date(dateStr) >= startDate() : true; }
    function periodLabel() { return periodDays ? 'Last ' + periodDays + ' days' : 'All time'; }

    /* ---------- render helpers ---------- */
    let csvRows = [];
    function money(v) { return EDY.fmt.money(v); }
    function num(v) { return EDY.fmt.num(v); }
    function day(s) { return EDY.fmt.date(s); }
    function dtime(s) { return EDY.fmt.datetime(s); }
    function view(html, rows) {
      document.getElementById('reportView').innerHTML = html;
      csvRows = rows || [];
    }
    function card(title, inner) {
      return '<div class="card mb-3"><div class="card-header py-2 fw-semibold fs-13">' + esc(title) + '</div><div class="card-body p-0">' + inner + '</div></div>';
    }
    function stat(label, value, sub) {
      return '<div class="report-stat"><div class="muted fs-12">' + esc(label) + '</div><div class="fs-4 fw-bold">' + value + '</div>' + (sub ? '<div class="muted fs-12">' + sub + '</div>' : '') + '</div>';
    }
    function kvRow(label, value, bold, indent) {
      return '<div class="d-flex justify-content-between py-1' + (indent ? ' ps-4' : '') + '"><span class="' + (bold ? 'fw-bold' : '') + '">' + esc(label) + '</span><span class="' + (bold ? 'fw-bold' : '') + ' ' + (value < 0 ? 'text-red' : '') + '">' + money(value) + '</span></div>';
    }
    function note(msg) {
      return '<div class="alert alert-soft fs-13 mb-3 py-2"><i class="bi bi-info-circle me-1"></i>' + esc(msg) + '</div>';
    }
    function empty(msg) {
      return '<div class="card"><div class="card-body text-center text-muted py-5"><i class="bi bi-inbox fs-1 d-block mb-2"></i>' + esc(msg || 'No data for this period') + '</div></div>';
    }
    function table(headRow, bodyHtml) {
      return '<div class="table-responsive"><table class="table align-middle mb-0"><thead>' + headRow + '</thead><tbody>' + bodyHtml + '</tbody></table></div>';
    }
    function statsRow(items) {
      return '<div class="report-stats mb-3">' + items.join('') + '</div>';
    }
    function csvPair(rows) { csvRows = rows; }

    /* ---------- cash-register View button ----------
     * Delegated on the report container rather than per-button, so the handler
     * survives every re-render of the register list. Bound once per init(). */
    function bindViewButtons() {
      const host = document.getElementById('reportView');
      if (!host || host.__viewBound) return;
      host.__viewBound = true;
      host.addEventListener('click', function (ev) {
        const btn = ev.target && ev.target.closest ? ev.target.closest('[data-view-session]') : null;
        if (!btn || !host.contains(btn)) return;
        ev.preventDefault();
        ev.stopPropagation();
        RENDER.sessionDetail(btn.getAttribute('data-view-session'));
      });
    }

    /* ---------- report registry ---------- */
    const GROUPS = [
      { name: 'Financial', icon: 'bi-bar-chart-line', reports: [
        { key: 'pl', label: 'Profit & Loss', icon: 'bi-bar-chart-line' },
        { key: 'tax', label: 'Sales Tax (VAT)', icon: 'bi-receipt' },
        { key: 'daybook', label: 'Daybook Summary', icon: 'bi-journal-text' },
        { key: 'activity', label: 'Activity Log', icon: 'bi-clock-history' }
      ]},
      { name: 'Sales & Purchasing', icon: 'bi-arrow-left-right', reports: [
        { key: 'tradesale', label: 'Purchase & Sale', icon: 'bi-arrow-left-right' },
        { key: 'trending', label: 'Trending Products', icon: 'bi-graph-up-arrow' },
        { key: 'sells', label: 'Product-wise Sales', icon: 'bi-bag-check' },
        { key: 'buys', label: 'Product-wise Purchases', icon: 'bi-bag' },
        { key: 'sellpay', label: 'Sale Payment Report', icon: 'bi-credit-card' },
        { key: 'buypay', label: 'Purchase Payment Report', icon: 'bi-cash-coin' }
      ]},
      { name: 'Inventory', icon: 'bi-box-seam', reports: [
        { key: 'stock', label: 'Stock Report', icon: 'bi-box-seam' },
        { key: 'opening', label: 'Opening Stock', icon: 'bi-archive' },
        { key: 'stkadj', label: 'Stock Adjustments', icon: 'bi-sliders' },
        { key: 'items', label: 'Items (Catalog)', icon: 'bi-upc-scan' }
      ]},
      { name: 'Partners', icon: 'bi-people', reports: [
        { key: 'partners', label: 'Customer & Supplier', icon: 'bi-people' },
        { key: 'custgroups', label: 'Customer Groups', icon: 'bi-person-lines-fill' },
        { key: 'master', label: 'Master Data', icon: 'bi-database' }
      ]},
      { name: 'Operations', icon: 'bi-gear', reports: [
        { key: 'expense', label: 'Expense Report', icon: 'bi-wallet2' },
        { key: 'register', label: 'Cash Register', icon: 'bi-cash-stack' },
        { key: 'srep', label: 'Sales Representative', icon: 'bi-person-badge' },
        { key: 'commission', label: 'Product Commission', icon: 'bi-percent' }
      ]}
    ];

    /* ---------- shell ---------- */
    box.innerHTML =
      '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">' +
      '<div><h1 class="page-title mb-1">Reports</h1><div class="page-sub">Business performance, financial summaries, inventory, and tax reports</div></div>' +
      '<div class="toolbar">' +
      '<select class="form-select form-select-sm w-auto" id="periodFilter">' +
      '<option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option><option value="0">All time</option></select>' +
      '<button class="btn btn-ghost btn-sm" id="btnPrint"><i class="bi bi-printer me-1"></i>Print</button>' +
      '<button class="btn btn-ghost btn-sm" id="btnCsv"><i class="bi bi-download me-1"></i>CSV</button>' +
      '</div></div>' +
      '<div class="reports-layout">' +
      '<aside class="card report-list"><div class="card-body p-2" id="reportList"></div></aside>' +
      '<section class="report-view" id="reportView"></section>' +
      '</div>';

    const RENDER = {
      /* ---------- Financial ---------- */
      pl: function () {
        const ss = sales.filter(s => s.status !== 'CANCELLED' && inRange(s.invoiceDate));
        const revenue = ss.reduce((a, x) => a + Number(x.totalAmount || 0), 0);
        const discounts = ss.reduce((a, x) => a + Number(x.discount || 0), 0);
        const salesVat = ss.reduce((a, x) => a + Number(x.taxAmount || 0), 0);
        let cogs = 0;
        ss.forEach(s => (s.items || []).forEach(it => {
          const p = pm[it.product && it.product.id];
          cogs += Number(it.quantity || 0) * Number(p ? p.costPrice : it.unitPrice || 0);
        }));
        const exps = ledger.filter(e => e.type === 'EXPENSE' && inRange(e.entryDate)).reduce((a, x) => a + Number(x.amount || 0), 0);
        const incs = ledger.filter(e => e.type === 'INCOME' && inRange(e.entryDate)).reduce((a, x) => a + Number(x.amount || 0), 0);
        const gross = revenue - cogs;
        const net = revenue + incs - cogs - exps;
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Profit &amp; Loss Statement</h5><div class="muted fs-13 mb-3">' + periodLabel() + '</div>' +
          statsRow([stat('Revenue (Sales)', money(revenue), ss.length + ' invoices'), stat('COGS', money(cogs), 'at cost price'), stat('Gross Profit', money(gross)), stat('Net Profit', money(net), net < 0 ? 'net loss' : 'net income')]) +
          '<div class="row g-2">' +
          '<div class="col-12 col-lg-7">' + card('Income', table(
            '<tr><th>Item</th><th class="text-end">Amount</th></tr>',
            kvRowHtml('Sales Revenue', revenue) + kvRowHtml('Other Income', incs))) + '</div>' +
          '<div class="col-12 col-lg-5">' + card('Expenses & COGS', table(
            '<tr><th>Item</th><th class="text-end">Amount</th></tr>',
            kvRowHtml('Cost of Goods Sold', cogs) + kvRowHtml('Operating Expenses', exps))) + '</div>' +
          '</div>' +
          '</div></div>',
          [['Revenue (Sales)', revenue], ['Other Income', incs], ['Cost of Goods Sold', cogs], ['Operating Expenses', exps], ['Gross Profit', gross], ['Net Profit', net]]
        );
        function kvRowHtml(label, value) {
          return '<tr><td>' + esc(label) + '</td><td class="text-end">' + money(value) + '</td></tr>';
        }
      },
      tax: function () {
        const ss = sales.filter(s => s.status !== 'CANCELLED' && inRange(s.invoiceDate));
        const ps = purchases.filter(p => p.status !== 'CANCELLED' && inRange(p.invoiceDate));
        const salesVat = ss.reduce((a, x) => a + Number(x.taxAmount || 0), 0);
        const salesNet = ss.reduce((a, x) => a + Number(x.subtotal || 0) - Number(x.discount || 0), 0);
        const purVat = ps.reduce((a, x) => a + Number(x.taxAmount || 0), 0);
        const purNet = ps.reduce((a, x) => a + Number(x.subtotal || 0) - Number(x.discount || 0), 0);
        const netVat = salesVat - purVat;
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Sales Tax Report (VAT)</h5><div class="muted fs-13 mb-3">' + periodLabel() + ' \u2014 VAT at ' + EDY.vat.pct() + '%</div>' +
          statsRow([stat('Sales (excl. VAT)', money(salesNet), ss.length + ' invoices'), stat('VAT Collected', money(salesVat)), stat('Input VAT (Purchases)', money(purVat)), stat('Net VAT Payable', money(netVat), netVat < 0 ? 'refundable' : 'own to government')]) +
          table(
            '<tr><th>Description</th><th class="text-end">Net</th><th class="text-end">VAT</th><th class="text-end">Gross</th></tr>',
            '<tr><td class="fw-semibold">Sales (Output VAT)</td><td class="text-end">' + money(salesNet) + '</td><td class="text-end">' + money(salesVat) + '</td><td class="text-end">' + money(salesNet + salesVat) + '</td></tr>' +
            '<tr><td class="fw-semibold">Purchases (Input VAT)</td><td class="text-end">' + money(purNet) + '</td><td class="text-end">' + money(purVat) + '</td><td class="text-end">' + money(purNet + purVat) + '</td></tr>'
          ) +
          '</div></div>',
          [['Output VAT (Sales)', salesVat], ['Input VAT (Purchases)', purVat], ['Net VAT Payable', netVat]]
        );
      },
      daybook: function () {
        const daysMap = {};
        const add = (k, fn) => { if (!daysMap[k]) daysMap[k] = { date: k, sales: 0, purchases: 0, income: 0, expense: 0 }; fn(daysMap[k]); };
        sales.filter(s => s.status !== 'CANCELLED' && inRange(s.invoiceDate))
          .forEach(s => add(norm(s.invoiceDate), d => d.sales += Number(s.totalAmount || 0)));
        purchases.filter(p => p.status !== 'CANCELLED' && inRange(p.invoiceDate))
          .forEach(p => add(norm(p.invoiceDate), d => d.purchases += Number(p.totalAmount || 0)));
        ledger.filter(e => inRange(e.entryDate))
          .forEach(e => add(norm(e.entryDate), d => { if (e.type === 'INCOME') d.income += Number(e.amount || 0); else d.expense += Number(e.amount || 0); }));
        const keys = Object.keys(daysMap).sort();
        if (!keys.length) { view(empty(), []); return; }
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Daybook Summary</h5><div class="muted fs-13 mb-3">' + periodLabel() + '</div>' +
          table(
            '<tr><th>Date</th><th class="text-end">Sales</th><th class="text-end">Purchases</th><th class="text-end">Income</th><th class="text-end">Expense</th><th class="text-end">Net</th></tr>',
            keys.map(k => { const d = daysMap[k]; const net = d.sales + d.income - d.purchases - d.expense;
              return '<tr><td>' + day(d.date) + '</td><td class="text-end text-green">' + money(d.sales) + '</td><td class="text-end text-red">' + money(d.purchases) + '</td>' +
                '<td class="text-end">' + money(d.income) + '</td><td class="text-end">' + money(d.expense) + '</td><td class="text-end fw-semibold">' + money(net) + '</td></tr>'; }).join('')
          ) +
          '</div></div>',
          keys.map(k => { const d = daysMap[k]; return [d.date, d.sales, d.purchases, d.income, d.expense, d.sales + d.income - d.purchases - d.expense]; })
        );
        function norm(s) { return s ? s.slice(0, 10) : ''; }
      },
      activity: function () {
        const es = ledger.filter(e => inRange(e.entryDate)).sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1));
        if (!es.length) { view(empty(), []); return; }
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Activity Log</h5><div class="muted fs-13 mb-3">Accounting transactions \u2014 ' + periodLabel() + '</div>' +
          table(
            '<tr><th>Date</th><th>Type</th><th>Description</th><th>Reference</th><th class="text-end">Amount</th></tr>',
            es.map(e => '<tr><td>' + day(e.entryDate) + '</td><td>' + EDY.badge.status(e.type) + '</td><td>' + esc(e.description || '\u2014') + '</td><td class="muted">' + esc(e.referenceType || '\u2014') + '</td>' +
              '<td class="text-end ' + (e.type === 'EXPENSE' ? 'text-red' : 'text-green') + '">' + money(e.amount) + '</td></tr>').join('')
          ) +
          '</div></div>',
          es.map(e => [e.entryDate, e.type, e.description || '', e.referenceType || '', e.amount])
        );
      },
      /* ---------- Sales & Purchasing ---------- */
      tradesale: function () {
        const ss = sales.filter(s => s.status !== 'CANCELLED' && inRange(s.invoiceDate));
        const ps = purchases.filter(p => p.status !== 'CANCELLED' && inRange(p.invoiceDate));
        const saleTotal = ss.reduce((a, x) => a + Number(x.totalAmount || 0), 0);
        const purTotal = ps.reduce((a, x) => a + Number(x.totalAmount || 0), 0);
        const net = saleTotal - purTotal;
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Purchase &amp; Sale Journal</h5><div class="muted fs-13 mb-3">' + periodLabel() + '</div>' +
          statsRow([
            stat('Sales', money(saleTotal), ss.length + ' invoices'),
            stat('Purchases', money(purTotal), ps.length + ' invoices'),
            stat('Net (Sales \u2212 Purchases)', money(net), net < 0 ? 'more bought than sold' : 'positive margin'),
            stat('Sales / Purchase Ratio', (purTotal ? (saleTotal / purTotal) : saleTotal ? '\u221e' : '\u2014'), null)
          ]) +
          table(
            '<tr><th>Date</th><th>Type</th><th>Number</th><th>Partner</th><th class="text-end">Amount</th></tr>',
            [].concat(
              ss.map(s => ({ d: s.invoiceDate, h: '<tr><td>' + day(s.invoiceDate) + '</td><td><span class="badge bg-soft-green">Sale</span></td><td>' + esc(s.invoiceNumber) + '</td><td>' + esc(s.customer ? s.customer.name : '\u2014') + '</td><td class="text-end text-green">' + money(s.totalAmount) + '</td></tr>' })),
              ps.map(p => ({ d: p.invoiceDate, h: '<tr><td>' + day(p.invoiceDate) + '</td><td><span class="badge bg-soft-red">Purchase</span></td><td>' + esc(p.invoiceNumber) + '</td><td>' + esc(p.supplier ? p.supplier.name : '\u2014') + '</td><td class="text-end text-red">' + money(p.totalAmount) + '</td></tr>' }))
            ).sort((a, b) => (a.d > b.d ? -1 : 1)).map(x => x.h).join('')
          ) +
          '</div></div>',
          [['Sales Total', saleTotal], ['Purchases Total', purTotal], ['Net', net]]
        );
      },
      trending: function () {
        const qty = {}, rev = {};
        sales.filter(s => s.status !== 'CANCELLED' && inRange(s.invoiceDate)).forEach(s =>
          (s.items || []).forEach(it => {
            const pid = it.product && it.product.id;
            if (pid == null) return;
            qty[pid] = (qty[pid] || 0) + Number(it.quantity || 0);
            rev[pid] = (rev[pid] || 0) + Number(it.lineTotal || Number(it.quantity || 0) * Number(it.unitPrice || 0));
          }));
        const arr = Object.keys(qty).map(pid => ({ pid, qty: qty[pid], rev: rev[pid] })).sort((a, b) => b.qty - a.qty).slice(0, 10);
        if (!arr.length) { view(empty(), []); return; }
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Trending Products</h5><div class="muted fs-13 mb-3">Top 10 by units sold \u2014 ' + periodLabel() + '</div>' +
          table(
            '<tr><th>#</th><th>Product</th><th class="text-end">Units Sold</th><th class="text-end">Revenue</th></tr>',
            arr.map((r, i) => '<tr><td class="muted">' + (i + 1) + '</td><td class="fw-semibold">' + esc(pname(pm[r.pid])) + '</td>' +
              '<td class="text-end">' + num(r.qty) + '</td><td class="text-end">' + money(r.rev) + '</td></tr>').join('')
          ) +
          '</div></div>',
          arr.map(r => [pm[r.pid] ? pm[r.pid].name : r.pid, r.qty, r.rev])
        );
      },
      sells: function () {
        const qty = {}, rev = {};
        sales.filter(s => s.status !== 'CANCELLED' && inRange(s.invoiceDate)).forEach(s =>
          (s.items || []).forEach(it => {
            const pid = it.product && it.product.id;
            if (pid == null) return;
            qty[pid] = (qty[pid] || 0) + Number(it.quantity || 0);
            rev[pid] = (rev[pid] || 0) + Number(it.lineTotal || Number(it.quantity || 0) * Number(it.unitPrice || 0));
          }));
        const arr = Object.keys(qty).map(pid => ({ pid, qty: qty[pid], rev: rev[pid] })).sort((a, b) => b.rev - a.rev);
        if (!arr.length) { view(empty(), []); return; }
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Product-wise Sales</h5><div class="muted fs-13 mb-3">' + periodLabel() + '</div>' +
          table(
            '<tr><th>Product</th><th class="text-end">Units</th><th class="text-end">Revenue</th><th class="text-end">Avg / Unit</th></tr>',
            arr.map(r => '<tr><td class="fw-semibold">' + esc(pname(pm[r.pid])) + '</td><td class="text-end">' + num(r.qty) + '</td>' +
              '<td class="text-end">' + money(r.rev) + '</td><td class="text-end">' + (r.qty ? money(r.rev / r.qty) : '\u2014') + '</td></tr>').join('')
          ) +
          '</div></div>',
          arr.map(r => [pm[r.pid] ? pm[r.pid].name : r.pid, r.qty, r.rev])
        );
      },
      buys: function () {
        const qty = {}, co = {};
        purchases.filter(p => p.status !== 'CANCELLED' && inRange(p.invoiceDate)).forEach(p =>
          (p.items || []).forEach(it => {
            const pid = it.product && it.product.id;
            if (pid == null) return;
            qty[pid] = (qty[pid] || 0) + Number(it.quantity || 0);
            co[pid] = (co[pid] || 0) + Number(it.lineTotal || Number(it.quantity || 0) * Number(it.unitCost || 0));
          }));
        const arr = Object.keys(qty).map(pid => ({ pid, qty: qty[pid], co: co[pid] })).sort((a, b) => b.co - a.co);
        if (!arr.length) { view(empty(), []); return; }
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Product-wise Purchases</h5><div class="muted fs-13 mb-3">' + periodLabel() + '</div>' +
          table(
            '<tr><th>Product</th><th class="text-end">Units</th><th class="text-end">Cost</th><th class="text-end">Avg / Unit</th></tr>',
            arr.map(r => '<tr><td class="fw-semibold">' + esc(pname(pm[r.pid])) + '</td><td class="text-end">' + num(r.qty) + '</td>' +
              '<td class="text-end">' + money(r.co) + '</td><td class="text-end">' + (r.qty ? money(r.co / r.qty) : '\u2014') + '</td></tr>').join('')
          ) +
          '</div></div>',
          arr.map(r => [pm[r.pid] ? pm[r.pid].name : r.pid, r.qty, r.co])
        );
      },
      sellpay: function () {
        const ss = sales.filter(s => s.status !== 'CANCELLED' && inRange(s.invoiceDate));
        const byMethod = {};
        ss.forEach(s => { const m = s.paymentMethod || 'OTHER'; byMethod[m] = byMethod[m] || { count: 0, total: 0 }; byMethod[m].count++; byMethod[m].total += Number(s.totalAmount || 0); });
        const methods = Object.keys(byMethod).sort();
        if (!methods.length) { view(empty(), []); return; }
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Sale Payment Report</h5><div class="muted fs-13 mb-3">' + periodLabel() + '</div>' +
          statsRow(methods.map(m => stat(m, money(byMethod[m].total), byMethod[m].count + ' invoices'))) +
          table(
            '<tr><th>Payment Method</th><th class="text-end">Invoices</th><th class="text-end">Total</th></tr>',
            methods.map(m => '<tr><td class="fw-semibold">' + esc(m) + '</td><td class="text-end">' + byMethod[m].count + '</td><td class="text-end">' + money(byMethod[m].total) + '</td></tr>').join('')
          ) +
          '</div></div>',
          methods.map(m => [m, byMethod[m].count, byMethod[m].total])
        );
      },
      buypay: function () {
        const ps = purchases.filter(p => p.status !== 'CANCELLED' && inRange(p.invoiceDate));
        const byStatus = {};
        ps.forEach(p => { const st = (p.paymentStatus || 'UNPAID').toUpperCase(); byStatus[st] = byStatus[st] || { count: 0, total: 0 }; byStatus[st].count++; byStatus[st].total += Number(p.totalAmount || 0); });
        const sts = Object.keys(byStatus).sort();
        if (!sts.length) { view(empty(), []); return; }
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Purchase Payment Report</h5><div class="muted fs-13 mb-3">' + periodLabel() + '</div>' +
          statsRow(sts.map(st => stat(st, money(byStatus[st].total), byStatus[st].count + ' invoices'))) +
          table(
            '<tr><th>Status</th><th class="text-end">Invoices</th><th class="text-end">Total</th></tr>',
            sts.map(st => '<tr><td class="fw-semibold">' + EDY.badge.status(st) + '</td><td class="text-end">' + byStatus[st].count + '</td><td class="text-end">' + money(byStatus[st].total) + '</td></tr>').join('')
          ) +
          '</div></div>',
          sts.map(st => [st, byStatus[st].count, byStatus[st].total])
        );
      },
      /* ---------- Inventory ---------- */
      stock: function () {
        const arr = products.map(p => {
          const cost = Number(p.quantityInStock || 0) * Number(p.costPrice || 0);
          const sell = Number(p.quantityInStock || 0) * Number(p.unitPrice || 0);
          return { p, cost, sell, margin: sell - cost, low: Number(p.quantityInStock || 0) <= Number(p.reorderLevel || 0) };
        });
        const totCost = arr.reduce((a, x) => a + x.cost, 0);
        const totSell = arr.reduce((a, x) => a + x.sell, 0);
        if (!arr.length) { view(empty(), []); return; }
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Stock Report</h5><div class="muted fs-13 mb-3">On-hand \u2014 value at cost and retail</div>' +
          statsRow([stat('Products', arr.length), stat('Stock Value (Cost)', money(totCost)), stat('Stock Value (Retail)', money(totSell)), stat('Potential Margin', money(totSell - totCost))]) +
          table(
            '<tr><th>SKU</th><th>Product</th><th class="text-end">On Hand</th><th class="text-end">Cost</th><th class="text-end">Value (Cost)</th><th>Status</th></tr>',
            arr.map(r => '<tr><td class="muted">' + esc(r.p.sku) + '</td><td class="fw-semibold">' + esc(r.p.name) + '</td>' +
              '<td class="text-end">' + num(r.p.quantityInStock) + '</td><td class="text-end">' + money(r.p.costPrice) + '</td><td class="text-end">' + money(r.cost) + '</td>' +
              '<td>' + (r.low ? '<span class="badge bg-soft-red">Low stock</span>' : '<span class="badge bg-soft-green">OK</span>') + '</td></tr>').join('')
          ) +
          '</div></div>',
          arr.map(r => [r.p.sku, r.p.name, r.p.quantityInStock, r.p.costPrice, r.cost])
        );
      },
      opening: function () {
        const net = {}; /* pid -> units in - out */
        movements.forEach(m => {
          const pid = m.product && m.product.id;
          if (pid == null) return;
          if (!inRange(m.date)) return;
          net[pid] = net[pid] || 0;
          net[pid] += (String(m.type).toUpperCase() === 'IN' ? 1 : -1) * Number(m.quantity || 0);
        });
        const arr = products.map(p => {
          const current = Number(p.quantityInStock || 0);
          const moved = net[p.id] || 0;
          return { p, moved, opening: current - moved };
        }).filter(r => r.moved !== 0 || r.opening !== 0).sort((a, b) => b.opening - a.opening);
        if (!arr.length) { view(empty('No stock movements recorded for this period'), []); return; }
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Opening Stock</h5><div class="muted fs-13 mb-3">Opening balance = on-hand \u2212 (stock in \u2212 stock out) for ' + periodLabel() + '</div>' +
          table(
            '<tr><th>Product</th><th class="text-end">Opening</th><th class="text-end">Moved (In/Out Net)</th><th class="text-end">On Hand</th></tr>',
            arr.map(r => '<tr><td class="fw-semibold">' + esc(pname(r.p)) + '</td><td class="text-end">' + num(r.opening) + '</td><td class="text-end">' + (r.moved >= 0 ? '+' : '') + num(r.moved) + '</td><td class="text-end">' + num(r.p.quantityInStock) + '</td></tr>').join('')
          ) +
          '</div></div>',
          arr.map(r => [pname(r.p), r.opening, r.moved, r.p.quantityInStock])
        );
      },
      stkadj: function () {
        const arr = movements.filter(m => (m.reference || '').toUpperCase() === 'MANUAL' || /adjust/i.test(m.note || ''));
        if (!arr.length) { view(empty('No manual stock adjustments found'), []); return; }
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Stock Adjustments</h5><div class="muted fs-13 mb-3">Manual inventory movements (reference MANUAL)</div>' +
          table(
            '<tr><th>Date</th><th>Product</th><th>Type</th><th class="text-end">Qty</th><th>Note</th></tr>',
            arr.sort((a, b) => (a.date > b.date ? -1 : 1)).map(m => '<tr><td>' + dtime(m.date) + '</td><td class="fw-semibold">' + esc(pname(m.product)) + '</td>' +
              '<td>' + EDY.badge.status(m.type) + '</td><td class="text-end">' + num(m.quantity) + '</td><td class="muted">' + esc(m.note || '\u2014') + '</td></tr>').join('')
          ) +
          '</div></div>',
          arr.map(m => [m.date, pname(m.product), m.type, m.quantity, m.note || ''])
        );
      },
      items: function () {
        const arr = products.sort((a, b) => (a.name < b.name ? -1 : 1));
        if (!arr.length) { view(empty(), []); return; }
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Items (Product Catalog)</h5><div class="muted fs-13 mb-3">' + arr.length + ' products</div>' +
          table(
            '<tr><th>SKU</th><th>Product</th><th>Category</th><th class="text-end">Sell</th><th class="text-end">Cost</th><th class="text-end">On Hand</th></tr>',
            arr.map(p => '<tr><td class="muted">' + esc(p.sku) + '</td><td class="fw-semibold">' + esc(p.name) + '</td>' +
              '<td>' + esc(p.category ? p.category.name : '\u2014') + '</td><td class="text-end">' + money(p.unitPrice) + '</td><td class="text-end">' + money(p.costPrice) + '</td><td class="text-end">' + num(p.quantityInStock) + '</td></tr>').join('')
          ) +
          '</div></div>',
          arr.map(p => [p.sku, p.name, p.category ? p.category.name : '', p.unitPrice, p.costPrice, p.quantityInStock])
        );
      },
      /* ---------- Partners ---------- */
      partners: function () {
        const custRows = customers.map(c => '<tr><td class="fw-semibold">' + esc(c.name) + '</td><td>' + esc(c.phone || '\u2014') + '</td><td>' + esc(c.email || '\u2014') + '</td><td class="muted">' + esc(c.address || '\u2014') + '</td></tr>').join('');
        const suppRows = suppliers.map(s => '<tr><td class="fw-semibold">' + esc(s.name) + '</td><td>' + esc(s.phone || '\u2014') + '</td><td>' + esc(s.email || '\u2014') + '</td><td class="muted">' + esc(s.address || '\u2014') + '</td></tr>').join('');
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Customers &amp; Suppliers</h5><div class="muted fs-13 mb-3">Contact directory</div>' +
          '<div class="row g-3">' +
          '<div class="col-12 col-lg-6">' + card('Customers (' + customers.length + ')', table(
            '<tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th></tr>', custRows || noRows(4))) + '</div>' +
          '<div class="col-12 col-lg-6">' + card('Suppliers (' + suppliers.length + ')', table(
            '<tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th></tr>', suppRows || noRows(4))) + '</div>' +
          '</div>' +
          '</div></div>',
          [].concat(
            customers.map(c => ['CUSTOMER', c.name, c.phone || '', c.email || '', c.address || '']),
            suppliers.map(s => ['SUPPLIER', s.name, s.phone || '', s.email || '', s.address || ''])
          )
        );
        function noRows(cols) { return '<tr><td colspan="' + cols + '" class="text-center text-muted py-3">None</td></tr>'; }
      },
      custgroups: function () {
        const byGroup = {};
        customers.forEach(c => {
          const g = c.group || 'General';
          byGroup[g] = byGroup[g] || [];
          byGroup[g].push(c);
        });
        const keys = Object.keys(byGroup).sort();
        if (!keys.length) { view(empty('No customers found'), []); return; }
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Customer Groups</h5><div class="muted fs-13 mb-3">' + periodLabel() + '</div>' +
          Object.keys(byGroup).sort().map(g =>
            '<div class="mb-3">' +
            '<div class="fw-semibold fs-14 mb-1"><i class="bi bi-people me-1 text-primary"></i>' + esc(g) + ' <span class="badge bg-soft-gray">' + byGroup[g].length + '</span></div>' +
            table('<tr><th>Customer</th><th>Phone</th><th>Email</th></tr>',
              byGroup[g].map(c => '<tr><td class="fw-semibold">' + esc(c.name) + '</td><td>' + esc(c.phone || '\u2014') + '</td><td>' + esc(c.email || '\u2014') + '</td></tr>').join('')) +
            '</div>').join('') +
          '</div></div>',
          keys.map(k => [k, byGroup[k].length])
        );
      },
      master: function () {
        const counts = {
          Products: [products.length, 'bi-box-seam'],
          Categories: [cats.length, 'bi-tags'],
          Customers: [customers.length, 'bi-people'],
          Suppliers: [suppliers.length, 'bi-truck'],
          Users: [users.length, 'bi-person-badge'],
          'Ledger Entries': [ledger.length, 'bi-journal-text']
        };
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Master Data</h5><div class="muted fs-13 mb-3">Reference data counts</div>' +
          statsRow(Object.keys(counts).map(k => stat(k, counts[k][0], '<i class="bi ' + counts[k][1] + '"></i>'))) +
          '</div></div>',
          Object.keys(counts).map(k => [k, counts[k][0]])
        );
      },
      /* ---------- Operations ---------- */
      expense: function () {
        const byCat = {};
        ledger.filter(e => e.type === 'EXPENSE' && inRange(e.entryDate)).forEach(e => {
          const k = e.description || 'General';
          byCat[k] = byCat[k] || { count: 0, total: 0 };
          byCat[k].count++;
          byCat[k].total += Number(e.amount || 0);
        });
        const keys = Object.keys(byCat).sort((a, b) => byCat[b].total - byCat[a].total);
        const grand = keys.reduce((a, k) => a + byCat[k].total, 0);
        if (!keys.length) { view(empty('No expenses recorded in this period'), []); return; }
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Expense Report</h5><div class="muted fs-13 mb-3">' + periodLabel() + '</div>' +
          statsRow([stat('Categories', keys.length), stat('Total Expenses', money(grand)), stat('Avg / Category', money(keys.length ? grand / keys.length : 0))]) +
          table(
            '<tr><th>Category</th><th class="text-end">Entries</th><th class="text-end">Total</th></tr>',
            keys.map(k => '<tr><td class="fw-semibold">' + esc(k) + '</td><td class="text-end">' + byCat[k].count + '</td><td class="text-end">' + money(byCat[k].total) + '</td></tr>').join('')
          ) +
          '</div></div>',
          keys.map(k => [k, byCat[k].count, byCat[k].total])
        );
      },
      register: function () {
        const reg = (window.EDY && window.EDY.register) ? window.EDY.register : null;
        if (!reg) { view(empty('Cash register module not loaded'), []); return; }
        const s = reg.getState();
        const open = s && s.open;
        const sessions = reg.sessions() || [];
        const current = open ? ['Current session', open.cashier || '\u2014', 'OPEN', open.openingCash || 0, open.cashIn || 0] : null;
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Cash Register</h5><div class="muted fs-13 mb-3">Open / close sessions</div>' +
          (open
            ? '<div class="alert alert-soft border-start border-success fs-14 py-2 mb-3 d-flex justify-content-between align-items-center gap-2"><span><i class="bi bi-cash-coin me-1 text-green"></i>Register is <span class="fw-bold">OPEN</span> \u2014 opened by ' + esc(open.cashier || '\u2014') + ' with ' + money(open.openingCash) + '. Cash received: ' + money(open.cashIn) + '. Expected: ' + money((Number(open.openingCash || 0)) + Number(open.cashIn || 0)) + '.</span>' +
            '<button class="btn btn-sm btn-outline-primary text-nowrap" type="button" data-view-session="current" title="View current session detail"><i class="bi bi-eye me-1"></i>View</button></div>'
            : '<div class="alert alert-soft border-start border-danger fs-14 py-2 mb-3"><i class="bi bi-cash-stack me-1 text-red"></i>Register is currently <span class="fw-bold">CLOSED</span>.</div>') +
          (sessions.length ? table(
            '<tr><th>Opened</th><th>Closed</th><th>Cashier</th><th class="text-end">Opening</th><th class="text-end">Cash In</th><th class="text-end">Expected</th><th class="text-end">Counted</th><th class="text-end">Diff</th><th class="text-end">View</th></tr>',
            sessions.map((x, i) => '<tr><td>' + dtime(x.openedAt) + '</td><td>' + dtime(x.closedAt) + '</td><td>' + esc(x.cashier || '\u2014') + '</td>' +
              '<td class="text-end">' + money(x.openingCash) + '</td><td class="text-end">' + money(x.cashIn) + '</td><td class="text-end">' + money(x.expected) + '</td>' +
              '<td class="text-end">' + money(x.counted) + '</td><td class="text-end ' + (x.difference < 0 ? 'text-red' : 'text-green') + '">' + money(x.difference) + '</td>' +
              '<td class="text-end"><button class="btn btn-sm btn-outline-primary" type="button" data-view-session="' + i + '" title="View session detail"><i class="bi bi-eye me-1"></i>View</button></td></tr>').join('')
          ) : empty('No closed sessions yet')) +
          '</div></div>',
          [].concat(current ? [current] : [], sessions.map(x => ['Session', x.cashier || '\u2014', 'CLOSED', x.openingCash, x.cashIn, x.counted, x.difference]))
        );
      },
      sessionDetail: function (idx) {
        const reg = (window.EDY && EDY.register) ? EDY.register : null;
        if (!reg) { view(empty('Cash register module not loaded'), []); return; }
        const state = reg.getState() || {};
        const closed = reg.sessions() || [];
        const live = state.open || null;

        // "current" opens the session that is still open; a number opens a closed one.
        const isCurrent = idx === 'current';
        const s = isCurrent ? live : closed[Number(idx)];
        if (!s) { view(empty('Session not found'), []); return; }

        // A session spans whole calendar days, because sales are dated by business
        // day ("2026-09-30") rather than by timestamp. Comparing a date-only invoice
        // against an exact open/close timestamp would drop every same-day sale, so we
        // widen the window to the first instant of the opening day .. last instant of
        // the closing day. Where a payment carries a real timestamp we still prefer it.
        const startAt = s.openedAt ? new Date(s.openedAt) : null;
        const endAt = s.closedAt ? new Date(s.closedAt) : new Date();
        const dayFrom = new Date(startAt || endAt);
        dayFrom.setHours(0, 0, 0, 0);
        const dayTo = new Date(endAt);
        dayTo.setHours(23, 59, 59, 999);

        function invoiceTime(v) {
          const pays = v.payments || [];
          const stamps = pays
            .map(p => (p && p.paidAt) ? new Date(p.paidAt) : null)
            .filter(d => d && !isNaN(d.getTime()));
          if (stamps.length) return new Date(Math.min.apply(null, stamps.map(d => d.getTime())));
          const raw = v.invoiceDate || v.createdAt || v.date;
          if (!raw) return null;
          const d = new Date(raw);
          return isNaN(d.getTime()) ? null : d;
        }

        const win = sales.filter(v => {
          const t = invoiceTime(v);
          if (!t) return false;
          return t.getTime() >= dayFrom.getTime() && t.getTime() <= dayTo.getTime();
        });

        const badge = (m) => 'badge ' + (m === 'CASH' ? 'bg-soft-green'
          : m === 'CARD' ? 'bg-soft-blue'
            : m === 'CREDIT' ? 'bg-soft-amber' : 'bg-soft-purple');

        // Each invoice lists every payment leg, so a part-cash / part-card sale
        // shows both. Invoices with no payment rows fall back to the single
        // paymentMethod recorded on the invoice itself.
        function paymentsOf(v) {
          const pays = v.payments || [];
          if (pays.length) {
            return pays.map(p => ({
              method: String(p.method || 'CASH').toUpperCase(),
              amount: Number(p.amount || 0),
              at: p.paidAt || null,
              note: p.note || ''
            }));
          }
          return [{
            method: String(v.paymentMethod || 'CASH').toUpperCase(),
            amount: Number(v.amountPaid != null ? v.amountPaid : (v.totalAmount || 0)),
            at: null,
            note: ''
          }];
        }

        function paymentCell(v) {
          return paymentsOf(v).map(p =>
            '<span class="' + badge(p.method) + ' me-1 mb-1" title="' + esc(p.note || p.method) + '">' +
            esc(p.method) + ' ' + money(p.amount) + '</span>').join(' ');
        }

        function itemsCell(v) {
          const its = (v.items || []).map(it => {
            const nm = (it.product && (it.product.name || it.productName)) || it.productName || it.name || '\u2014';
            const q = it.qty || it.quantity || 1;
            const pr = it.price || it.unitPrice || it.unitCost || 0;
            const lt = it.lineTotal != null ? it.lineTotal : (Number(q) * Number(pr));
            return '<div class="fs-13">' + esc(nm) + ' <span class="muted">&times; ' + q + ' @ ' + money(pr) +
              '</span> = <span class="fw-semibold">' + money(lt) + '</span></div>';
          }).join('');
          return its || '<span class="muted">\u2014</span>';
        }

        // Totals per payment method, so the header answers "how much cash / card".
        const totals = {};
        let billed = 0, received = 0, count = 0;
        win.forEach(v => {
          count++;
          billed += Number(v.totalAmount || v.total || 0);
          paymentsOf(v).forEach(p => {
            totals[p.method] = (totals[p.method] || 0) + p.amount;
            received += p.amount;
          });
        });
        const methods = Object.keys(totals).sort();
        const totalCards = count;

        const summaryCards = [
          stat('Invoices', String(totalCards)),
          stat('Billed', money(billed)),
          stat('Received', money(received)),
          stat('Still due', money(billed - received))
        ].concat(methods.map(m => stat(m, money(totals[m]))));

        const hdr = '<tr><th>Invoice</th><th>Date</th><th>Customer</th>' +
          '<th class="text-end">Total</th><th>Payments</th><th>What was sold</th></tr>';
        const rows = win.map(v =>
          '<tr><td><code>' + esc(v.invoiceNumber || v.invoiceNo || v.id) + '</code></td>' +
          '<td class="fs-13">' + day(v.invoiceDate || v.createdAt) + '</td>' +
          '<td>' + esc((v.customer && (v.customer.name || v.customer.company)) || v.customerName || '\u2014') + '</td>' +
          '<td class="text-end fw-semibold">' + money(v.totalAmount || v.total || 0) + '</td>' +
          '<td>' + paymentCell(v) + '</td>' +
          '<td>' + itemsCell(v) + '</td></tr>').join('');

        const diff = Number(s.difference || 0);
        const diffCls = diff < 0 ? 'text-red' : diff > 0 ? 'text-amber' : 'text-green';

        view(
          '<div class="card"><div class="card-body">' +
          '<div class="d-flex justify-content-between align-items-center mb-3">' +
          '<h5 class="fw-bold mb-0"><i class="bi bi-cash-stack me-2 text-primary"></i>' +
          (isCurrent ? 'Current Session' : 'Session Detail') +
          (isCurrent ? ' <span class="badge bg-soft-green">OPEN</span>' : ' <span class="badge bg-soft-gray">CLOSED</span>') +
          '</h5>' +
          '<button class="btn btn-sm btn-outline-secondary" type="button" id="btnBackSession">' +
          '<i class="bi bi-arrow-left me-1"></i>Back to register</button></div>' +

          '<div class="d-flex flex-wrap gap-4 mb-3 fs-13">' +
          '<div><span class="muted">Opened</span><div class="fw-semibold">' + dtime(s.openedAt) + '</div></div>' +
          '<div><span class="muted">Closed</span><div class="fw-semibold">' + (s.closedAt ? dtime(s.closedAt) : 'Still open') + '</div></div>' +
          '<div><span class="muted">Cashier</span><div class="fw-semibold">' + esc(s.cashier || '\u2014') + '</div></div>' +
          '<div><span class="muted">Opening float</span><div class="fw-semibold">' + money(s.openingCash) + '</div></div>' +
          (isCurrent
            ? '<div><span class="muted">Cash received</span><div class="fw-semibold">' + money(s.cashIn) + '</div></div>' +
            '<div><span class="muted">Expected in drawer</span><div class="fw-semibold">' + money(Number(s.openingCash || 0) + Number(s.cashIn || 0)) + '</div></div>'
            : '<div><span class="muted">Expected</span><div class="fw-semibold">' + money(s.expected) + '</div></div>' +
            '<div><span class="muted">Counted</span><div class="fw-semibold">' + money(s.counted) + '</div></div>' +
            '<div><span class="muted">Difference</span><div class="fw-semibold ' + diffCls + '">' + money(diff) + '</div></div>') +
          '</div>' +

          statsRow(summaryCards) +

          note('Sales are matched to this session by calendar day (' +
            day(dayFrom) + (dayFrom.getTime() !== dayTo.getTime() ? ' \u2013 ' + day(dayTo) : '') +
            '). An invoice counts if any of its payments was received in that window.') +

          (win.length ? table(hdr, rows)
            : empty('No sales were recorded in this session')) +
          '</div></div>',

          win.map(v => [
            v.invoiceNumber || '',
            v.invoiceDate || '',
            (v.customer && (v.customer.name || v.customer.company)) || v.customerName || '',
            money(v.totalAmount || v.total || 0),
            paymentsOf(v).map(p => p.method + ' ' + money(p.amount)).join(' + ')
          ])
        );

        const back = document.getElementById('btnBackSession');
        if (back) back.addEventListener('click', () => RENDER.register());
      },
      bindSessionViews: function () {
        // Kept for callers that used to call it; the real binding happens once
        // at the bottom of init(). Safe to call repeatedly.
        bindViewButtons();
      },
      srep: function () {
        const arr = users.map(u => ({ u, sales: 0, amount: 0 }));
        if (!arr.length) { view(empty('No users found'), []); return; }
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Sales Representatives</h5><div class="muted fs-13 mb-3">User accounts by role</div>' +
          note('Sales invoices do not store a sales representative, so live per-rep performance is unavailable. Showing registered users for reference.') +
          table(
            '<tr><th>Name</th><th>Username</th><th>Role</th><th>Branch</th><th>Status</th></tr>',
            arr.map(x => '<tr><td class="fw-semibold">' + esc(x.u.fullName || x.u.username) + '</td><td>' + esc(x.u.username) + '</td>' +
              '<td>' + esc(x.u.role || '\u2014') + '</td><td>' + esc(x.u.branch || '\u2014') + '</td><td>' + (x.u.active === false ? '<span class="badge bg-soft-gray">Inactive</span>' : '<span class="badge bg-soft-green">Active</span>') + '</td></tr>').join('')
          ) +
          '</div></div>',
          arr.map(x => [x.u.fullName || x.u.username, x.u.username, x.u.role || '', x.u.branch || '', x.u.active === false ? 'Inactive' : 'Active'])
        );
      },
      commission: function () {
        const arr = products.map(p => {
          const cost = Number(p.costPrice || 0);
          const sell = Number(p.unitPrice || 0);
          const margin = sell - cost;
          const pct = sell ? (margin / sell) * 100 : 0;
          return { p, cost, sell, margin, pct };
        }).sort((a, b) => b.pct - a.pct);
        if (!arr.length) { view(empty('No products found'), []); return; }
        view(
          '<div class="card"><div class="card-body">' +
          '<h5 class="fw-bold mb-1">Product Commission</h5><div class="muted fs-13 mb-3">Margin analysis (no commission % stored on products)</div>' +
          note('Products do not store a commission rate. This report shows gross margin per unit; set commission as a % of margin externally.') +
          table(
            '<tr><th>Product</th><th class="text-end">Cost</th><th class="text-end">Sell</th><th class="text-end">Margin</th><th class="text-end">Margin %</th></tr>',
            arr.map(r => '<tr><td class="fw-semibold">' + esc(r.p.name) + '</td><td class="text-end">' + money(r.cost) + '</td><td class="text-end">' + money(r.sell) + '</td>' +
              '<td class="text-end">' + money(r.margin) + '</td><td class="text-end">' + r.pct.toFixed(1) + '%</td></tr>').join('')
          ) +
          '</div></div>',
          arr.map(r => [r.p.name, r.cost, r.sell, r.margin, r.pct.toFixed(1) + '%'])
        );
      }
    };

    /* ---------- sidebar ---------- */
    let activeKey = 'pl';
    function renderList() {
      const el = document.getElementById('reportList');
      el.innerHTML = GROUPS.map(g =>
        '<div class="report-group mb-1">' +
        '<div class="report-group-label"><i class="bi ' + g.icon + ' me-1"></i>' + esc(g.name) + '</div>' +
        g.reports.map(r =>
          '<button class="report-btn' + (r.key === activeKey ? ' active' : '') + '" data-key="' + r.key + '">' +
          '<i class="bi ' + r.icon + '"></i><span>' + esc(r.label) + '</span></button>').join('') +
        '</div>').join('');
      el.querySelectorAll('.report-btn').forEach(b => b.addEventListener('click', () => {
        activeKey = b.dataset.key;
        renderList();
        if (RENDER[activeKey]) RENDER[activeKey]();
      }));
    }

    document.getElementById('periodFilter').addEventListener('change', () => {
      periodDays = Number(document.getElementById('periodFilter').value);
      if (RENDER[activeKey]) RENDER[activeKey]();
    });
    document.getElementById('btnPrint').addEventListener('click', () => window.print());
    document.getElementById('btnCsv').addEventListener('click', () => {
      if (!csvRows.length) { EDY.ui.toast('Nothing to export', 'warning'); return; }
      const blob = new Blob(['\ufeff' + csvRows.map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'report-' + today + '.csv'; a.click();
    });

    renderList();
    bindViewButtons();
    if (RENDER[activeKey]) RENDER[activeKey]();
  }
}
