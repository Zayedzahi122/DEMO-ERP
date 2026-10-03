/* EDY ERP — Dashboard */
window.PAGE = {
  init: async function () {

    const box = document.getElementById('pageContent');

    function greeting() {
      const h = new Date().getHours();
      if (h < 12) return 'Good Morning';
      if (h < 17) return 'Good Afternoon';
      return 'Good Evening';
    }

    /* ---------- layout skeleton ---------- */
    box.innerHTML =
      '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">' +
        '<div><h1 class="page-title mb-1">' + greeting() + ', ' + escape2(EDY.me.name) + '</h1>' +
        '<div class="page-sub">Here\u2019s what\u2019s happening across your business today.</div></div>' +
        '<div class="quick-actions">' +
          '<a class="btn btn-primary" href="/pos"><i class="bi bi-plus-lg me-1"></i>New Sale</a>' +
          '<a class="btn btn-soft-primary" href="/products?new=1"><i class="bi bi-box-seam me-1"></i>Add Product</a>' +
          '<a class="btn btn-soft-success" href="/purchases?new=1"><i class="bi bi-cart-plus me-1"></i>Purchase</a>' +
          '<a class="btn btn-ghost" href="/customers?new=1"><i class="bi bi-person-plus me-1"></i>Add Customer</a>' +
        '</div>' +
      '</div>' +

      '<div class="row g-3 mb-4" id="kpis"><div class="col-12 text-center py-4"><div class="spinner-border text-primary"></div></div></div>' +

      '<div class="row g-3 mb-4">' +
        '<div class="col-12 col-xl-8">' +
          '<div class="card h-100"><div class="card-header"><span><i class="bi bi-graph-up me-2 text-primary"></i>Sales Overview</span>' +
          '<select class="form-select form-select-sm w-auto" id="salesRange"><option value="14">Last 14 days</option><option value="30">Last 30 days</option></select></div>' +
          '<div class="card-body"><div style="height:280px"><canvas id="salesChart"></canvas></div></div></div>' +
        '</div>' +
        '<div class="col-12 col-xl-4">' +
          '<div class="card h-100"><div class="card-header"><span><i class="bi bi-pie-chart me-2 text-primary"></i>Sales by Category</span></div>' +
          '<div class="card-body"><div style="height:280px"><canvas id="catChart"></canvas></div></div></div>' +
        '</div>' +
      '</div>' +

      '<div class="row g-3 mb-4">' +
        '<div class="col-12 col-xl-4">' +
          '<div class="card h-100"><div class="card-header"><span><i class="bi bi-cart me-2 text-primary"></i>Purchase Overview</span></div>' +
          '<div class="card-body"><div style="height:220px"><canvas id="purchaseChart"></canvas></div></div></div>' +
        '</div>' +
        '<div class="col-12 col-xl-8">' +
          '<div class="card h-100"><div class="card-header"><span><i class="bi bi-lightning-charge me-2 text-primary"></i>Top Selling Products</span></div>' +
          '<div class="card-body" id="topProducts"><div class="text-center py-4 muted">Loading&hellip;</div></div></div>' +
        '</div>' +
      '</div>' +

      '<div class="row g-3">' +
        '<div class="col-12 col-xl-7">' +
          '<div class="card h-100"><div class="card-header"><span><i class="bi bi-receipt me-2 text-primary"></i>Recent Transactions</span>' +
          '<a href="/sales" class="fs-13 text-primary">View all</a></div>' +
          '<div class="table-wrap"><table class="table" id="recentTable"><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody></tbody></table></div></div>' +
        '</div>' +
        '<div class="col-12 col-xl-5">' +
          '<div class="card h-100"><div class="card-header"><span><i class="bi bi-exclamation-triangle me-2 text-amber"></i>Low Stock Alerts</span>' +
          '<a href="/inventory" class="fs-13 text-primary">View all</a></div>' +
          '<div class="card-body p-2" id="lowStockList"><div class="text-center py-4 muted">Loading&hellip;</div></div></div>' +
        '</div>' +
      '</div>';

    function escape2(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

    /* ---------- data ---------- */
    const [summary, products, lowStock, sales, purchases, customers, ledger, suppliers, employees] = await Promise.all([
      EDY.api.get('/api/dashboard/summary').catch(() => null),
      EDY.api.get('/api/products').catch(() => []),
      EDY.api.get('/api/products/low-stock').catch(() => []),
      EDY.api.get('/api/sales-invoices').catch(() => []),
      EDY.api.get('/api/purchase-invoices').catch(() => []),
      EDY.api.get('/api/customers').catch(() => []),
      EDY.api.get('/api/ledger').catch(() => []),
      EDY.api.get('/api/suppliers').catch(() => []),
      EDY.api.get('/api/employees').catch(() => [])
    ]);

    /* money helpers */
    const plans = { sales: moneyOf(sales, 'totalAmount'), purchases: moneyOf(purchases, 'totalAmount'), ledger: moneyOf(ledger, 'amount') };
    function moneyOf(arr, key) { return (arr || []).reduce((s, r) => s + Number(r[key] || 0), 0); }
    function byDate(arr, d) { return (arr || []).filter(r => sameDay(new Date(r.invoiceDate || r.entryDate || r.date), d)); }
    function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

    // money/num come from EDY.fmt so they follow the scale set in Settings.
// Declared before first use - these are const, not hoisted function declarations.
const money = EDY.fmt.money;
const num = EDY.fmt.num;

const today = new Date();
    const todaySales = byDate(sales, today).reduce((s, r) => s + Number(r.totalAmount || 0), 0);
    const todayOrders = byDate(sales, today).length;
    const purchaseAmt = moneyOf(purchases, 'totalAmount');
    const ledgerIncome = (ledger || []).filter(l => l.type === 'INCOME').reduce((s, r) => s + Number(r.amount || 0), 0);
    const ledgerExpense = (ledger || []).filter(l => l.type === 'EXPENSE').reduce((s, r) => s + Number(r.amount || 0), 0);

    /* prior-period comparison for sales */
    const pm1 = new Date(); pm1.setDate(pm1.getDate() - 1);
    const priorSales = byDate(sales, pm1).reduce((s, r) => s + Number(r.totalAmount || 0), 0);
    const salesTrend = priorSales > 0 ? ((todaySales - priorSales) / priorSales) * 100 : (todaySales > 0 ? 100 : 0);

    const statCards = [
      { label: 'Today\u2019s Sales', value: money(todaySales), icon: 'bi-cash-stack', tone: 'text-primary', bg: 'bg-primary bg-opacity-10', trend: pct(salesTrend) },
      { label: 'Total Orders', value: num(totalOrders(sales)), icon: 'bi-bag-check', tone: 'text-teal', bg: 'bg-teal bg-opacity-10', trend: num(todayOrders) + ' today' },
      { label: 'Total Products', value: num((products || []).length), icon: 'bi-box-seam', tone: 'text-purple', bg: 'bg-purple bg-opacity-10', trend: (lowStock || []).length + ' low stock' },
      { label: 'Low-stock Products', value: num((lowStock || []).length), icon: 'bi-exclamation-triangle', tone: 'text-red', bg: 'bg-red bg-opacity-10', trend: 'needs attention' },
      { label: 'Total Customers', value: num((customers || []).length), icon: 'bi-people', tone: 'text-blue', bg: 'bg-blue bg-opacity-10', trend: (suppliers || []).length + ' suppliers' },
      { label: 'Purchase Amount', value: money(purchaseAmt), icon: 'bi-cart-plus', tone: 'text-amber', bg: 'bg-amber bg-opacity-10', trend: num((purchases || []).length) + ' orders' },
      { label: 'Expenses', value: money(ledgerExpense), icon: 'bi-wallet2', tone: 'text-red', bg: 'bg-red bg-opacity-10', trend: 'this month' },
      { label: 'Net Revenue', value: money(ledgerIncome - ledgerExpense), icon: 'bi-graph-up-arrow', tone: 'text-green', bg: 'bg-green bg-opacity-10', trend: money(ledgerIncome) + ' income' }
    ];

    let kpiHtml = '';
    statCards.forEach(c => {
      kpiHtml +=
        '<div class="col-12 col-sm-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body d-flex align-items-start gap-3 p-3">' +
        '<div class="stat-icon ' + c.bg + ' ' + c.tone + '"><i class="bi ' + c.icon + '"></i></div>' +
        '<div class="flex-grow-1"><div class="stat-value">' + c.value + '</div><div class="stat-label">' + c.label + '</div>' +
        '<div class="stat-trend muted fs-12 mt-1"><i class="bi ' + (c.trend.indexOf('+') === 0 ? 'bi-arrow-up-right text-success' : c.trend.indexOf('-') === 0 ? 'bi-arrow-down-right text-danger' : 'bi-dash text-muted') + '"></i> ' + c.trend + '</div>' +
        '</div></div></div></div>';
    });
    document.getElementById('kpis').innerHTML = kpiHtml;

    function pct(v) { return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; }
    function totalOrders(s) { return (s || []).length; }

    /* ---------- charts ---------- */
    function lastNDays(n) {
      const days = [];
      for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
      return days;
    }
    function fillSeries(days, arr, key) {
      return days.map(d => byDate(arr, d).reduce((s, r) => s + Number(r[key] || 0), 0));
    }
    const days14 = lastNDays(14);
    const salesSeries = fillSeries(days14, sales, 'totalAmount');
    const purchaseSeries = fillSeries(days14, purchases, 'totalAmount');
    const dayLabels = days14.map(d => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));

    EDY.ui.chart(document.getElementById('salesChart'), {
      type: 'bar',
      data: { labels: dayLabels, datasets: [{ label: 'Sales (OMR)', data: salesSeries, backgroundColor: 'rgba(37,99,235,.85)', hoverBackgroundColor: '#1d4ed8', borderRadius: 6, barPercentage: .7 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: EDY.ui.baseFont() } }, x: { grid: { display: false }, ticks: { color: '#64748b', font: EDY.ui.baseFont(), maxRotation: 0 } } } }
    });

    /* category doughnut */
    const catMap = {};
    (sales || []).forEach(inv => (inv.items || []).forEach(it => {
      const cat = (it.product && it.product.category && it.product.category.name) ? it.product.category.name : 'Uncategorized';
      catMap[cat] = (catMap[cat] || 0) + Number(it.lineTotal || 0);
    }));
    const catLabels = Object.keys(catMap);
    EDY.ui.chart(document.getElementById('catChart'), {
      type: 'doughnut',
      data: { labels: catLabels, datasets: [{ data: catLabels.map(k => catMap[k]), backgroundColor: EDY.badge.colors.map((c, i) => i % 8 === 7 ? '#0ea5e9' : EDY.badge.colors[i]), borderWidth: 3, borderColor: '#fff' }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: '#475569', font: EDY.ui.baseFont(), boxWidth: 12, padding: 14 } } } }
    });

    EDY.ui.chart(document.getElementById('purchaseChart'), {
      type: 'line',
      data: { labels: dayLabels, datasets: [{ label: 'Purchases (OMR)', data: purchaseSeries, borderColor: '#0d9488', backgroundColor: 'rgba(13,148,136,.12)', fill: true, tension: .4, pointRadius: 2, pointHoverRadius: 5 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: EDY.ui.baseFont() } }, x: { grid: { display: false }, ticks: { color: '#64748b', font: EDY.ui.baseFont(), maxRotation: 0 } } } }
    });

    document.getElementById('salesRange').addEventListener('change', async (e) => {
      const n = Number(e.target.value);
      const days = lastNDays(n);
      const labels = days.map(d => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
      EDY.ui.chart(document.getElementById('salesChart'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Sales (OMR)', data: fillSeries(days, sales, 'totalAmount'), backgroundColor: 'rgba(37,99,235,.85)', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false }, ticks: { maxRotation: 0 } } } }
      });
    });

    /* ---------- top products ---------- */
    const topMap = {};
    (sales || []).forEach(inv => (inv.items || []).forEach(it => {
      const pid = it.product ? it.product.id : it.productId;
      const name = it.product ? it.product.name : 'Item';
      topMap[pid] = topMap[pid] || { name, qty: 0, total: 0 };
      topMap[pid].qty += Number(it.quantity || 0);
      topMap[pid].total += Number(it.lineTotal || 0);
    }));
    const topList = Object.values(topMap).sort((a, b) => b.total - a.total).slice(0, 6);
    const maxTop = Math.max(...topList.map(t => t.total), 1);
    document.getElementById('topProducts').innerHTML = topList.length
      ? topList.map(t =>
        '<div class="d-flex align-items-center gap-2 mb-3">' +
        '<div class="progress flex-grow-1 progress-xs" style="height:10px"><div class="progress-bar" style="width:' + Math.round(t.total / maxTop * 100) + '%"></div></div>' +
        '<div class="text-end" style="min-width:150px"><div class="fs-13 fw-bold">' + escape2(t.name) + '</div><div class="muted fs-12">' + num(t.qty) + ' sold &middot; ' + money(t.total) + '</div></div>' +
        '</div>').join('')
      : '<div class="empty-state py-4"><i class="bi bi-cart-x"></i><h6 class="mt-2">No sales yet</h6></div>';

    /* ---------- recent transactions ---------- */
    const recentSales = [...(sales || [])].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 8);
    const tbody = document.querySelector('#recentTable tbody');
    tbody.innerHTML = recentSales.length ? recentSales.map(inv =>
      '<tr class="hoverable" onclick="location.href=\'/invoice?id=' + inv.id + '&type=sale\'">' +
      '<td class="fw-bold text-primary">' + escape2(inv.invoiceNumber) + '</td>' +
      '<td>' + escape2(inv.customer ? inv.customer.name : '\u2014') + '</td>' +
      '<td class="muted">' + EDY.fmt.date(inv.invoiceDate) + '</td>' +
      '<td class="fw-bold">' + money(inv.totalAmount) + '</td>' +
      '<td>' + EDY.badge.status(inv.status) + '</td></tr>').join('')
      : '<tr><td colspan="5"><div class="empty-state py-3"><i class="bi bi-receipt"></i><h6 class="mt-2">No transactions yet</h6></div></td></tr>';

    /* ---------- low stock ---------- */
    const lowEl = document.getElementById('lowStockList');
    lowEl.innerHTML = lowStock.length
      ? lowStock.slice(0, 6).map(p =>
        '<div class="d-flex align-items-center gap-3 p-2 mb-1 rounded">' +
        '<div class="product-thumb"><i class="bi bi-box2"></i></div>' +
        '<div class="flex-grow-1"><div class="fs-13 fw-bold">' + escape2(p.name) + '</div><div class="muted fs-12">' + escape2(p.sku) + '</div></div>' +
        '<div class="text-end"><span class="badge ' + (p.quantityInStock <= 0 ? 'bg-soft-red' : 'bg-soft-amber') + '">' + num(p.quantityInStock) + ' left</span>' +
        '<div class="muted fs-12 mt-1">min ' + num(p.reorderLevel || 0) + '</div></div></div>').join('')
      : '<div class="empty-state py-4"><i class="bi bi-check-circle text-success"></i><h6 class="mt-2">All stock levels are healthy</h6></div>';
  }
};