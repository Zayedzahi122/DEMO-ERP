/* EDY ERP — Payment Accounts (accounts, fund transfer, financial statements) */
window.PAGE = {
  init: async function () {
    const box = document.getElementById('pageContent');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const today = new Date().toISOString().slice(0, 10);

    /* ---------- data ---------- */
    let accounts = [], transfers = [], ledger = [], sales = [], purchases = [], products = [];
    async function loadData() {
      [accounts, transfers, ledger, sales, purchases, products] = await Promise.all([
        EDY.api.get('/api/payment-accounts').catch(() => []),
        EDY.api.get('/api/fund-transfers').catch(() => []),
        EDY.api.get('/api/ledger').catch(() => []),
        EDY.api.get('/api/sales-invoices').catch(() => []),
        EDY.api.get('/api/purchase-invoices').catch(() => []),
        EDY.api.get('/api/products').catch(() => [])
      ]);
    }
    const acctMap = () => { const m = {}; accounts.forEach(a => m[a.id] = a); return m; };

    /* ---------- period ---------- */
    let fromDate = '', toDate = '';
    function inRange(d) {
      const v = (d || '').slice(0, 10);
      if (fromDate && toDate) return v >= fromDate && v <= toDate;
      if (fromDate) return v >= fromDate;
      if (toDate) return v <= toDate;
      return true;
    }

    /* ---------- render helpers ---------- */
    let exportTitle = '', exportHead = [], exportRows = [];
    function money(v) { return EDY.fmt.money(v); }
    function num(v) { return EDY.fmt.num(v); }
    function d(s) { return EDY.fmt.date(s); }
    function view(html) {
      document.getElementById('reportView').innerHTML = html;
    }
    function card(title, inner) {
      return '<div class="card mb-3"><div class="card-header py-2 fw-semibold fs-13">' + esc(title) + '</div><div class="card-body p-0">' + inner + '</div></div>';
    }
    function table(headRow, bodyHtml) {
      return '<div class="table-responsive"><table class="table align-middle mb-0"><thead>' + headRow + '</thead><tbody>' + bodyHtml + '</tbody></table></div>';
    }
    function stat(label, value, sub) {
      return '<div class="report-stat"><div class="muted fs-12">' + esc(label) + '</div><div class="fs-4 fw-bold">' + value + '</div>' + (sub ? '<div class="muted fs-12">' + sub + '</div>' : '') + '</div>';
    }
    function statsRow(items) {
      return '<div class="report-stats mb-3">' + items.join('') + '</div>';
    }
    function empty(msg) {
      return '<div class="card"><div class="card-body text-center text-muted py-5"><i class="bi bi-inbox fs-1 d-block mb-2"></i>' + esc(msg || 'No data in this period') + '</div></div>';
    }
    function noRows(cols) { return '<tr><td colspan="' + cols + '" class="text-center text-muted py-3">No data</td></tr>'; }
    function toolbar() {
      return '<div class="toolbar mb-3">' +
        '<div class="input-group input-group-sm w-auto"><span class="input-group-text">From</span><input type="date" class="form-control" id="frmFrom" value="' + fromDate + '"></div>' +
        '<div class="input-group input-group-sm w-auto"><span class="input-group-text">To</span><input type="date" class="form-control" id="frmTo" value="' + toDate + '"></div>' +
        '<button class="btn btn-primary btn-sm" id="frmApply"><i class="bi bi-funnel me-1"></i>Apply</button>' +
        '<button class="btn btn-ghost btn-sm" id="frmClear"><i class="bi bi-x-lg me-1"></i>Clear</button>' +
        '<span class="ms-auto"></span>' +
        '<button class="btn btn-ghost btn-sm" id="frmXls"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button>' +
        '<button class="btn btn-ghost btn-sm" id="frmPdf"><i class="bi bi-printer me-1"></i>Print</button>' +
        '</div>';
    }
    function wireToolbar(renderFn) {
      const a = document.getElementById('frmApply');
      const c = document.getElementById('frmClear');
      if (a) a.addEventListener('click', () => {
        fromDate = (document.getElementById('frmFrom').value || '').slice(0, 10);
        toDate = (document.getElementById('frmTo').value || '').slice(0, 10);
        renderFn();
      });
      if (c) c.addEventListener('click', () => {
        fromDate = ''; toDate = '';
        if (document.getElementById('frmFrom')) document.getElementById('frmFrom').value = '';
        if (document.getElementById('frmTo')) document.getElementById('frmTo').value = '';
        renderFn();
      });
      const x = document.getElementById('frmXls');
      if (x) x.addEventListener('click', doExcel);
      const p = document.getElementById('frmPdf');
      if (p) p.addEventListener('click', doPdf);
    }
    function doExcel() {
      if (!exportRows.length) { EDY.ui.toast('Nothing to export', 'warning'); return; }
      const blob = new Blob(['\ufeff' + (exportHead.join(',') + '\n') + exportRows.map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (exportTitle || 'payment-account') + '-' + today + '.csv'; a.click();
    }
    /**
     * Every section already declares what it shows through setExport(), so print
     * goes through that same data — one report, one document — instead of a second
     * hand-built table that could drift away from what is on screen. The old PDF
     * button opened a window and printed on arrival; this shows the report first,
     * and the browser's own dialog still offers Save as PDF.
     */
    function doPdf() {
      if (!exportRows.length) { EDY.ui.toast('Nothing to export', 'warning'); return; }
      // Right-align a column only when every value in it is numeric, so a column of
      // references is not indented as though it were money.
      const numeric = exportHead.map((h, i) =>
        exportRows.every(r => r[i] === '' || r[i] == null || Number.isFinite(Number(r[i]))));
      EDY.print.preview({
        title: exportTitle,
        subtitle: 'Generated ' + new Date().toLocaleString(),
        html: EDY.print.list(exportTitle,
          exportHead.map((h, i) => ({ label: h, align: numeric[i] ? 'r' : 'l' })),
          exportRows.map(r => r.map(c => esc(c == null ? '' : c))),
          { lines: [] })
      });
    }
    function setExport(title, head, rows) { exportTitle = title; exportHead = head; exportRows = rows; }

    /* ---------- section registry ---------- */
    const SECTIONS = [
      { key: 'accounts', label: 'List Accounts', icon: 'bi-collection', run: rListAccounts },
      { key: 'transfer', label: 'Fund Transfer', icon: 'bi-arrow-left-right', run: rTransfer },
      { key: 'assets', label: 'Balance Sheet', icon: 'bi-balance-scale', run: rBalanceSheet },
      { key: 'trial', label: 'Trial Balance', icon: 'bi-list-check', run: rTrialBalance },
      { key: 'cashflow', label: 'Cash Flow', icon: 'bi-cash-stack', run: rCashFlow },
      { key: 'statement', label: 'Payment Account Report', icon: 'bi-receipt-cutoff', run: rStatement }
    ];
    const secById = {}; SECTIONS.forEach(s => secById[s.key] = s);

    /*__SECTIONS__*/

    /* ---------- shell ---------- */
    box.innerHTML =
      '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">' +
      '<div><h1 class="page-title mb-1">Payment Accounts</h1><div class="page-sub">Accounts, fund transfers, and financial statements</div></div>' +
      '</div>' +
      '<div class="reports-layout">' +
      '<aside class="card report-list"><div class="card-body p-2" id="reportList"></div></aside>' +
      '<section class="report-view" id="reportView"></section>' +
      '</div>';

    let activeKey = 'accounts';
    function renderList() {
      const el = document.getElementById('reportList');
      el.innerHTML = '<div class="report-group">' +
        '<div class="report-group-label">Payment Accounts</div>' +
        SECTIONS.map(s => '<button class="report-btn' + (s.key === activeKey ? ' active' : '') + '" data-key="' + s.key + '">' +
          '<i class="bi ' + s.icon + '"></i><span>' + esc(s.label) + '</span></button>').join('') +
        '</div>';
      el.querySelectorAll('.report-btn').forEach(b => b.addEventListener('click', () => {
        activeKey = b.dataset.key;
        renderList();
        secById[activeKey].run();
      }));
    }

    const par = new URLSearchParams(location.search);
    if (par.get('view') && secById[par.get('view')]) activeKey = par.get('view');

    renderList();
    // The sections read the arrays loaded here, so the first paint has to wait for
    // them — otherwise List Accounts opens on "No data in this period" with four
    // accounts already in the system, and only recovers the next time something is
    // deleted or moved.
    await loadData();
    secById[activeKey].run();

    /* ================= List Accounts ================= */
    function rListAccounts() {
      const am = acctMap();
      const filtered = accounts.filter(a => a.createdAt ? inRange(a.createdAt) : a.id);
      const total = filtered.reduce((s, a) => s + Number(a.currentBalance || 0), 0);
      setExport('List Accounts', ['Code', 'Name', 'Type', 'Bank/Provider', 'Opening', 'Current Balance', 'Status'], filtered.map(a => [a.code, a.name, a.type, a.bankDetails || '', a.openingBalance, a.currentBalance, a.active ? 'Active' : 'Inactive']));
      view(
        '<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">' +
        '<button class="btn btn-primary btn-sm" id="paAdd"><i class="bi bi-plus-lg me-1"></i>Add Account</button>' +
        '<div class="topbar-search" style="max-width:280px"><i class="bi bi-search"></i><input id="paSearch" placeholder="Search accounts&hellip;"></div>' +
        '</div>' +
        toolbar() + statsRow([
          stat('Accounts', filtered.length),
          stat('Total Balance', money(total)),
          stat('Active', filtered.filter(a => a.active).length)
        ]) +
        (filtered.length ? card('Payment Accounts', table(
          '<tr><th>Code</th><th>Name</th><th>Type</th><th>Bank / Provider</th><th class="text-end">Balance</th><th>Status</th><th>Actions</th></tr>',
          filtered.map(a => '<tr><td class="muted">' + esc(a.code) + '</td><td class="fw-semibold">' + esc(a.name) + '</td>' +
            '<td>' + typeBadge(a.type) + '</td><td class="muted fs-13">' + esc(a.bankDetails || '\u2014') + '</td>' +
            '<td class="text-end fw-semibold">' + money(a.currentBalance) + '</td>' +
            '<td>' + (a.active ? '<span class="badge bg-soft-green">Active</span>' : '<span class="badge bg-soft-gray">Inactive</span>') + '</td>' +
            '<td><button class="btn btn-ghost btn-icon me-1" data-edit="' + a.id + '" title="Edit"><i class="bi bi-pencil"></i></button>' +
            '<button class="btn btn-ghost btn-icon me-1" data-print="' + a.id + '" title="Preview and print"><i class="bi bi-printer"></i></button>' +
            '<button class="btn btn-soft-danger btn-icon" data-del="' + a.id + '" title="Delete"><i class="bi bi-trash"></i></button></td></tr>').join('')
        )) : empty()));
      document.getElementById('paAdd').addEventListener('click', () => acctForm(null));
      const rv = document.getElementById('reportView');
      if (!rv.dataset.editBound) {
        rv.dataset.editBound = '1';
        rv.addEventListener('click', (e) => {
          const eb = e.target.closest('[data-edit]');
          const db = e.target.closest('[data-del]');
          const pb = e.target.closest('[data-print]');
          if (pb) printAccount(Number(pb.dataset.print));
          else if (eb) { const a = accounts.find(x => x.id === Number(eb.dataset.edit)); if (a) acctForm(a); }
          else if (db) delAccount(Number(db.dataset.del));
        });
      }
      const si = document.getElementById('paSearch');
      if (si) si.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const rows = filtered.filter(a => (a.name || '').toLowerCase().includes(q) || (a.code || '').toLowerCase().includes(q));
        const body = rows.map(a => buildAccountRow(a)).join('') || noRows(7);
        document.querySelector('#reportView .table tbody').innerHTML = body;
      });
      wireToolbar(rListAccounts);
      function buildAccountRow(a) {
        return '<tr><td class="muted">' + esc(a.code) + '</td><td class="fw-semibold">' + esc(a.name) + '</td>' +
          '<td>' + typeBadge(a.type) + '</td><td class="muted fs-13">' + esc(a.bankDetails || '\u2014') + '</td>' +
          '<td class="text-end fw-semibold">' + money(a.currentBalance) + '</td>' +
          '<td>' + (a.active ? '<span class="badge bg-soft-green">Active</span>' : '<span class="badge bg-soft-gray">Inactive</span>') + '</td>' +
          '<td><button class="btn btn-ghost btn-icon me-1" data-edit="' + a.id + '" title="Edit"><i class="bi bi-pencil"></i></button>' +
          '<button class="btn btn-ghost btn-icon me-1" data-print="' + a.id + '" title="Preview and print"><i class="bi bi-printer"></i></button>' +
          '<button class="btn btn-soft-danger btn-icon" data-del="' + a.id + '" title="Delete"><i class="bi bi-trash"></i></button></td></tr>';
      }
    }

    function typeBadge(t) {
      const c = { CASH: 'bg-soft-green', BANK: 'bg-soft-blue', CARD: 'bg-soft-purple', MOBILE: 'bg-soft-amber', OTHER: 'bg-soft-gray' };
      return '<span class="badge ' + (c[t] || 'bg-soft-gray') + '">' + esc(t || 'OTHER') + '</span>';
    }

    /** One payment account on paper: what it is and what it is holding. */
    function printAccount(id) {
      const a = accounts.find(x => x.id === id);
      if (!a) return;
      EDY.print.preview({
        title: a.name,
        subtitle: 'Payment account ' + (a.code || ''),
        html: EDY.print.record('Payment account', a.code || '', [
          ['Code', a.code || '\u2014'],
          ['Name', a.name],
          ['Type', a.type || 'OTHER'],
          ['Bank / provider', a.bankDetails || '\u2014'],
          ['Opening balance', money(a.openingBalance)],
          ['Current balance', money(a.currentBalance)],
          ['Status', a.active !== false ? 'Active' : 'Inactive']
        ])
      });
    }
    function acctForm(acct) {
      document.getElementById('acctModalTitle').textContent = acct ? 'Edit Account' : 'Add Account';
      document.getElementById('aName').value = acct ? acct.name || '' : '';
      document.getElementById('aCode').value = acct ? acct.code || '' : '';
      document.getElementById('aType').value = acct ? acct.type || 'CASH' : 'CASH';
      document.getElementById('aBank').value = acct ? acct.bankDetails || '' : '';
      document.getElementById('aOpening').value = acct ? acct.openingBalance : 0;
      document.getElementById('aBalance').value = acct ? acct.currentBalance : 0;
      document.getElementById('aActive').checked = acct ? acct.active !== false : true;
      document.getElementById('acctForm').dataset.id = acct ? acct.id : '';
      EDY.ui.openModal('acctModal');
    }
    document.getElementById('acctForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('acctForm').dataset.id;
      const payload = {
        name: document.getElementById('aName').value.trim(),
        code: document.getElementById('aCode').value.trim() || null,
        type: document.getElementById('aType').value,
        bankDetails: document.getElementById('aBank').value.trim() || null,
        openingBalance: Number(document.getElementById('aOpening').value || 0),
        currentBalance: Number(document.getElementById('aBalance').value || 0),
        active: document.getElementById('aActive').checked
      };
      try {
        if (id) { await EDY.api.put('/api/payment-accounts/' + id, payload); EDY.ui.toast('Account updated'); }
        else { await EDY.api.post('/api/payment-accounts', payload); EDY.ui.toast('Account created'); }
        EDY.ui.closeModal('acctModal');
        await loadData(); rListAccounts();
      } catch (err) { EDY.ui.toast(err.message, 'error'); }
    });
    async function delAccount(id) {
      const a = accounts.find(x => x.id === id);
      if (!a) return;
      const ok = await EDY.ui.confirm('Delete account?', 'Delete "' + a.name + '"? This cannot be undone.');
      if (!ok) return;
      try { await EDY.api.del('/api/payment-accounts/' + id); await loadData(); rListAccounts(); EDY.ui.toast('Account deleted'); }
      catch (err) { EDY.ui.toast(err.message, 'error'); }
    }

    /* ================= Fund Transfer ================= */
    function rTransfer() {
      const am = acctMap();
      const filtered = transfers.filter(t => inRange(t.transferDate));
      const totalIn = filtered.reduce((s, t) => s + Number(t.amount || 0), 0);
      setExport('Fund Transfers', ['Reference', 'Date', 'From', 'To', 'Amount', 'Note'], filtered.map(t => [t.reference, t.transferDate, am[t.fromAccount && t.fromAccount.id] ? am[t.fromAccount.id].name : (t.fromAccount && t.fromAccount.name) || '', am[t.toAccount && t.toAccount.id] ? am[t.toAccount.id].name : (t.toAccount && t.toAccount.name) || '', t.amount, t.note || '']));
      view(
        '<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">' +
        '<button class="btn btn-primary btn-sm" id="paTransfer"><i class="bi bi-arrow-left-right me-1"></i>New Fund Transfer</button>' +
        '</div>' +
        toolbar() + statsRow([stat('Transfers', filtered.length), stat('Total Transferred', money(totalIn))]) +
        (filtered.length ? card('Fund Transfer History', table(
          '<tr><th>Reference</th><th>Date</th><th>From</th><th>To</th><th class="text-end">Amount</th><th>Note</th></tr>',
          filtered.map(t => {
            const fn = t.fromAccount && t.fromAccount.name ? '' : '';
            const from = am[t.fromAccount && t.fromAccount.id] ? am[t.fromAccount.id].name : (t.fromAccount && t.fromAccount.name) || '\u2014';
            const to = am[t.toAccount && t.toAccount.id] ? am[t.toAccount.id].name : (t.toAccount && t.toAccount.name) || '\u2014';
            return '<tr><td class="muted">' + esc(t.reference) + '</td><td>' + d(t.transferDate) + '</td>' +
              '<td class="fw-semibold">' + esc(from) + '</td><td class="fw-semibold">' + esc(to) + '</td>' +
              '<td class="text-end fw-semibold text-red">' + money(t.amount) + '</td><td class="muted">' + esc(t.note || '\u2014') + '</td></tr>';
          }).join('')
        )) : empty()));
      document.getElementById('paTransfer').addEventListener('click', fillTransferForm);
      wireToolbar(rTransfer);
    }
    function fillTransferForm() {
      const sel = (id) => accounts.filter(a => a.active).map(a => '<option value="' + a.id + '">' + esc(a.name) + ' (' + money(a.currentBalance) + ')</option>').join('');
      document.getElementById('tfFrom').innerHTML = sel();
      document.getElementById('tfTo').innerHTML = sel();
      document.getElementById('tfAmt').value = '';
      document.getElementById('tfDate').value = new Date().toISOString().slice(0, 10);
      document.getElementById('tfNote').value = '';
      EDY.ui.openModal('transferModal');
    }
    document.getElementById('transferForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const amt = Number(document.getElementById('tfAmt').value || 0);
      if (amt <= 0) { EDY.ui.toast('Amount must be positive', 'warning'); return; }
      const payload = {
        fromAccountId: Number(document.getElementById('tfFrom').value),
        toAccountId: Number(document.getElementById('tfTo').value),
        amount: amt,
        transferDate: document.getElementById('tfDate').value || null,
        note: document.getElementById('tfNote').value.trim() || null
      };
      try {
        await EDY.api.post('/api/fund-transfers', payload);
        EDY.ui.closeModal('transferModal');
        await loadData(); rTransfer(); EDY.ui.toast('Fund transfer completed');
      } catch (err) { EDY.ui.toast(err.message, 'error'); }
    });

    /* ================= Balance Sheet ================= */
    function rBalanceSheet() {
      const cash = accounts.reduce((s, a) => s + Number(a.currentBalance || 0), 0);
      const invValue = products.reduce((s, p) => s + Number(p.quantityInStock || 0) * Number(p.costPrice || 0), 0);
      const ar = sales.filter(s => s.status !== 'CANCELLED' && inRange(s.invoiceDate)).reduce((s, x) => s + Number(x.totalAmount || 0), 0);
      const ap = purchases.filter(p => p.status !== 'CANCELLED' && inRange(p.invoiceDate)).reduce((s, x) => s + Number(x.totalAmount || 0), 0);
      const assets = cash + invValue + ar;
      const equity = assets - ap;
      setExport('Balance Sheet', ['Item', 'Amount'], [
        ['Cash & Bank (Accounts)', cash], ['Inventory Value', invValue], ['Accounts Receivable', ar], ['Total Assets', assets], ['Accounts Payable', ap], ['Equity', equity]
      ]);
      view(
        card('Balance Sheet', '<div class="card-body">' +
          '<div class="muted fs-13 mb-3">' + periodTxt() + '</div>' +
          statsRow([stat('Cash & Bank', money(cash), accounts.length + ' accounts'), stat('Inventory Value', money(invValue)), stat('Receivables', money(ar)), stat('Payables', money(ap))]) +
          statement('Assets', [
            ['Cash & Bank (Payment Accounts)', cash],
            ['Inventory Value (at cost)', invValue],
            ['Accounts Receivable (sales)', ar],
            ['Total Assets', assets, true]
          ]) +
          statement('Liabilities & Equity', [
            ['Accounts Payable (purchases)', ap],
            ['Equity (Assets \u2212 Liabilities)', equity, true]
          ]) +
          '</div>'));
      wireToolbar(rBalanceSheet);
    }
    function statement(title, rows) {
      return '<div class="fw-bold fs-14 mt-3 mb-1">' + esc(title) + '</div>' +
        rows.map(r => '<div class="d-flex justify-content-between py-1' + (r[2] ? ' fw-bold border-top mt-1 pt-2' : '') + '"><span>' + esc(r[0]) + '</span><span>' + money(r[1]) + '</span></div>').join('');
    }

    /* ================= Trial Balance ================= */
    function rTrialBalance() {
      const rows = [];
      let totDr = 0, totCr = 0;
      accounts.forEach(a => {
        const b = Number(a.currentBalance || 0);
        if (b >= 0) { rows.push([a.code, a.name, b, 0]); totDr += b; }
        else { rows.push([a.code, a.name, 0, -b]); totCr += -b; }
      });
      if (rows.length) {
        const diff = Math.abs(totDr - totCr);
        if (totDr >= totCr) { rows.push(['PL', 'Retained Earnings / Equity', 0, diff]); totCr += diff; }
        else { rows.push(['PL', 'Retained Earnings / Equity', diff, 0]); totDr += diff; }
      }
      setExport('Trial Balance', ['Code', 'Account', 'Debit', 'Credit'],
        rows.concat([['', 'TOTAL', totDr, totCr]]).map(r => [r[0], r[1], r[2], r[3]]));
      view(
        card('Trial Balance', '<div class="card-body">' +
          '<div class="muted fs-13 mb-3">Balances as of ' + new Date().toLocaleDateString('en-GB') + ' \u2014 debit = income/assets, credit = liabilities/equity</div>' +
          table(
            '<tr><th>Code</th><th>Account</th><th class="text-end">Debit</th><th class="text-end">Credit</th></tr>',
            rows.map(r => '<tr><td class="muted">' + esc(r[0]) + '</td><td class="fw-semibold">' + esc(r[1]) + '</td><td class="text-end">' + (r[2] ? money(r[2]) : '\u2014') + '</td><td class="text-end">' + (r[3] ? money(r[3]) : '\u2014') + '</td></tr>').join('') +
            '<tr class="fw-bold border-top"><td colspan="2">TOTAL</td><td class="text-end">' + money(totDr) + '</td><td class="text-end">' + money(totCr) + '</td></tr>'
          ) +
          '</div>'));
      wireToolbar(rTrialBalance);
    }

    /* ================= Cash Flow ================= */
    function rCashFlow() {
      const opIn = ledger.filter(e => e.type === 'INCOME' && inRange(e.entryDate)).reduce((s, x) => s + Number(x.amount || 0), 0);
      const opOut = ledger.filter(e => e.type === 'EXPENSE' && inRange(e.entryDate)).reduce((s, x) => s + Number(x.amount || 0), 0);
      const salesCash = sales.filter(s => s.status !== 'CANCELLED' && inRange(s.invoiceDate)).reduce((s, x) => s + Number(x.totalAmount || 0), 0);
      const purCash = purchases.filter(p => p.status !== 'CANCELLED' && inRange(p.invoiceDate)).reduce((s, x) => s + Number(x.totalAmount || 0), 0);
      const transfersOut = transfers.filter(t => inRange(t.transferDate)).reduce((s, t) => s + Number(t.amount || 0), 0);
      const inTotal = opIn + salesCash;
      const outTotal = opOut + purCash + transfersOut;
      const net = inTotal - outTotal;
      setExport('Cash Flow', ['Item', 'Amount'], [
        ['Income (ledger)', opIn], ['Sales (cash)', salesCash], ['Total Inflows', inTotal],
        ['Expenses (ledger)', opOut], ['Purchases', purCash], ['Fund Transfers Out', transfersOut], ['Total Outflows', outTotal], ['Net Cash Flow', net]
      ]);
      view(
        card('Cash Flow Statement', '<div class="card-body">' +
          '<div class="muted fs-13 mb-3">' + periodTxt() + '</div>' +
          statsRow([stat('Total Inflows', money(inTotal)), stat('Total Outflows', money(outTotal)), stat('Net Cash Flow', money(net), net < 0 ? 'negative' : 'positive')]) +
          '<div class="fw-bold fs-14 mt-1 mb-1">Operating Activity</div>' +
          kv('Income (ledger)', opIn) + kv('Sales collected', salesCash) +
          '<div class="fw-bold fs-14 mt-3 mb-1">Outflows</div>' +
          kv('Expenses (ledger)', opOut) + kv('Purchases', purCash) + kv('Fund transfers out', transfersOut) +
          '<div class="fw-bold border-top mt-2 pt-2 fs-15 d-flex justify-content-between"><span>Net Cash Flow</span><span class="' + (net < 0 ? 'text-red' : 'text-green') + '">' + money(net) + '</span></div>' +
          '</div>'));
      wireToolbar(rCashFlow);
    }
    function kv(label, v) {
      return '<div class="d-flex justify-content-between py-1"><span class="muted">' + esc(label) + '</span><span>' + money(v) + '</span></div>';
    }

    /* ================= Payment Account Report ================= */
    function rStatement() {
      const am = acctMap();
      const tf = transfers.filter(t => inRange(t.transferDate));
      const rows = accounts.map(a => {
        const inn = tf.filter(t => t.toAccount && Number(t.toAccount.id) === a.id).reduce((s, t) => s + Number(t.amount || 0), 0);
        const onn = tf.filter(t => t.fromAccount && Number(t.fromAccount.id) === a.id).reduce((s, t) => s + Number(t.amount || 0), 0);
        const closing = Number(a.currentBalance || 0);
        const opening = closing - inn + onn;
        return { a, opening, inn, onn, closing };
      });
      const totIn = rows.reduce((s, r) => s + r.inn, 0);
      const totOut = rows.reduce((s, r) => s + r.onn, 0);
      setExport('Payment Account Report', ['Code', 'Account', 'Opening', 'Transfers In', 'Transfers Out', 'Closing'],
        rows.map(r => [r.a.code, r.a.name, r.opening, r.inn, r.onn, r.closing]));
      view(
        card('Payment Account Report', '<div class="card-body">' +
          '<div class="muted fs-13 mb-3">' + periodTxt() + '</div>' +
          table(
            '<tr><th>Code</th><th>Account</th><th class="text-end">Opening</th><th class="text-end">In</th><th class="text-end">Out</th><th class="text-end">Closing</th></tr>',
            rows.map(r => '<tr><td class="muted">' + esc(r.a.code) + '</td><td class="fw-semibold">' + esc(r.a.name) + '</td>' +
              '<td class="text-end">' + money(r.opening) + '</td><td class="text-end text-green">' + money(r.inn) + '</td>' +
              '<td class="text-end text-red">' + money(r.onn) + '</td><td class="text-end fw-bold">' + money(r.closing) + '</td></tr>').join('') +
            '<tr class="fw-bold border-top"><td colspan="2">TOTAL</td><td class="text-end">' + money(rows.reduce((s, r) => s + r.opening, 0)) + '</td>' +
            '<td class="text-end">' + money(totIn) + '</td><td class="text-end">' + money(totOut) + '</td><td class="text-end">' + money(rows.reduce((s, r) => s + r.closing, 0)) + '</td></tr>'
          ) +
          '</div>'));
      wireToolbar(rStatement);
    }

    function periodTxt() {
      if (fromDate && toDate) return fromDate + ' \u2192 ' + toDate;
      if (fromDate) return 'From ' + fromDate;
      if (toDate) return 'Until ' + toDate;
      return 'All time';
    }
  }
};