/* EDY ERP — Expenses */
window.PAGE = {
  init: async function () {
    const box = document.getElementById('pageContent');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const today = new Date().toISOString().slice(0, 10);

    let entries = [];
    /** The list as last filtered, so Print reports exactly what is on screen. */
    let shownList = [];

    box.innerHTML =
      '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">' +
      '<div><h1 class="page-title mb-1">Expenses</h1><div class="page-sub">Record and track business expenses (sales lead to automatic expense entries for cost of goods)</div></div>' +
      '<button class="btn btn-primary" id="btnAdd"><i class="bi bi-plus-lg me-1"></i>Add Expense</button>' +
      '</div>' +

      '<div class="row g-3 mb-4">' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value text-red" id="kThisMonth">\u2014</div><div class="stat-label">This Month</div></div></div></div>' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value" id="kTotal">\u2014</div><div class="stat-label">Total Expenses</div></div></div></div>' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value text-blue" id="kCount">\u2014</div><div class="stat-label">Entries</div></div></div></div>' +
      '<div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body"><div class="stat-value text-amber" id="kAvg">\u2014</div><div class="stat-label">Average</div></div></div></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-body">' +
      '<div class="d-flex flex-wrap gap-2 mb-3">' +
      '<div class="topbar-search" style="max-width:300px"><i class="bi bi-search"></i><input id="tblSearch" placeholder="Search description&hellip;"></div>' +
      '<select class="form-select w-auto" id="typeFilter"><option value="">All entries</option><option value="AUTO">Auto (from sales/purchases)</option><option value="MANUAL">Manual only</option></select>' +
      '<button class="btn btn-ghost ms-auto" id="btnCsv"><i class="bi bi-download me-1"></i>CSV</button>' +
      '<button class="btn btn-ghost" id="btnPrint"><i class="bi bi-printer me-1"></i>Print</button>' +
      '</div>' +
      '<div class="table-wrap"><table class="table" id="eTable"></table></div>' +
      '</div></div>';

    const month = today.slice(0, 7);
    const thisMonth = entries.filter(e => e.type === 'EXPENSE' && e.entryDate && e.entryDate.startsWith(month));
    document.getElementById('kThisMonth').textContent = EDY.fmt.money(thisMonth.reduce((s, e) => s + Number(e.amount || 0), 0));
    document.getElementById('kTotal').textContent = EDY.fmt.money(entries.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + Number(e.amount || 0), 0));
    document.getElementById('kCount').textContent = entries.filter(e => e.type === 'EXPENSE').length;
    const totalExp = entries.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + Number(e.amount || 0), 0);
    document.getElementById('kAvg').textContent = EDY.fmt.money(entries.filter(e => e.type === 'EXPENSE').length ? totalExp / entries.filter(e => e.type === 'EXPENSE').length : 0);

    function render() {
      const expenses = entries.filter(e => e.type === 'EXPENSE');
      let list = expenses;
      const tf = document.getElementById('typeFilter').value;
      if (tf === 'AUTO') list = expenses.filter(e => e.referenceType && e.referenceType !== 'MANUAL');
      if (tf === 'MANUAL') list = expenses.filter(e => !e.referenceType || e.referenceType === 'MANUAL');
      shownList = list;

      EDY.ui.table({
        el: document.getElementById('eTable'),
        searchInput: document.getElementById('tblSearch'),
        data: list,
        pageSize: 12,
        columns: [
          { key: 'entryDate', label: 'Date', date: true },
          { key: 'description', label: 'Description', render: (r) => '<div class="fw-bold">' + esc(r.description) + '</div>' + (r.referenceType ? '<div class="muted fs-12">' + esc(r.referenceType) + ' #' + (r.referenceId || '') + '</div>' : '') },
          { key: 'referenceType', label: 'Source', render: (r) => {
            if (!r.referenceType || r.referenceType === 'MANUAL') return '<span class="badge bg-soft-gray">Manual</span>';
            if (r.referenceType === 'PURCHASE_INVOICE') return '<span class="badge bg-soft-blue">Purchase</span>';
            if (r.referenceType === 'SALES_INVOICE') return '<span class="badge bg-soft-green">Sale</span>';
            return '<span class="badge bg-soft-gray">' + esc(r.referenceType) + '</span>'; } },
          { key: 'amount', label: 'Amount', money: true, className: 'fw-bold text-red' },
          { key: 'id', label: '', render: (r) => {
            let html = '<button class="btn btn-ghost btn-icon btn-sm me-1" data-print="' + r.id + '" title="Preview and print"><i class="bi bi-printer"></i></button>';
            if (r.referenceType && r.referenceType !== 'MANUAL') return html;
            return html + '<button class="btn btn-soft-danger btn-icon btn-sm" data-del="' + r.id + '" title="Delete"><i class="bi bi-trash"></i></button>'; } }
        ]
      });
      box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => remove(Number(b.dataset.del))));
      box.querySelectorAll('[data-print]').forEach(b => b.addEventListener('click', () => printExpense(Number(b.dataset.print))));
    }

    /**
     * One expense as a voucher. Auto entries name the document they came from,
     * because "Cost of goods — 12.00" means nothing to whoever is checking the book
     * unless it says which sale produced it.
     */
    function printExpense(id) {
      const e = entries.find(x => x.id === id);
      if (!e) return;
      const source = (!e.referenceType || e.referenceType === 'MANUAL')
        ? 'Manual'
        : (e.referenceType === 'PURCHASE_INVOICE' ? 'Purchase' :
           e.referenceType === 'SALES_INVOICE' ? 'Sale' : e.referenceType);
      EDY.print.preview({
        title: e.description || 'Expense',
        subtitle: 'Expense voucher \u00b7 ' + (e.entryDate || ''),
        html: EDY.print.record('Expense voucher', e.entryDate || '', [
          ['Date', e.entryDate || '\u2014'],
          ['Description', e.description || '\u2014'],
          ['Source', source],
          ['Reference', e.referenceId ? String(e.referenceType) + ' #' + e.referenceId : '\u2014'],
          ['Amount', EDY.fmt.money(e.amount)]
        ])
      });
    }

    /** The filtered expense list as a document — what the CSV button exports, on paper. */
    function printList() {
      const list = shownList || [];
      if (!list.length) { EDY.ui.toast('Nothing to print', 'warning'); return; }
      const total = list.reduce((s, e) => s + Number(e.amount || 0), 0);
      EDY.print.preview({
        title: 'Expenses',
        subtitle: list.length + ' entries',
        html: EDY.print.list('Expense report', [
          { label: 'Date' },
          { label: 'Description' },
          { label: 'Source' },
          { label: 'Amount', align: 'r' }
        ], list.map(e => [
          esc(e.entryDate || ''),
          esc(e.description || ''),
          esc((!e.referenceType || e.referenceType === 'MANUAL') ? 'Manual' : e.referenceType),
          esc(EDY.fmt.money(e.amount))
        ]), {
          summary: [
            { label: 'Entries', value: String(list.length) },
            { label: 'Total', value: EDY.fmt.money(total), bold: true }
          ]
        })
      });
    }

    async function remove(id) {
      const ok = await EDY.ui.confirm('Delete expense entry?', 'This entry will be permanently removed from the ledger.');
      if (!ok) return;
      try {
        await EDY.api.del('/api/ledger/' + id);
        entries = entries.filter(x => x.id !== id);
        render();
        EDY.ui.toast('Entry deleted');
      } catch (e) { EDY.ui.toast(e.message, 'error'); }
    }

    document.getElementById('btnAdd').addEventListener('click', () => {
      document.getElementById('exDesc').value = '';
      document.getElementById('exDate').value = today;
      document.getElementById('exAmt').value = '';
      document.getElementById('exNotes').value = '';
      EDY.ui.openModal('expModal');
    });

    document.getElementById('expForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const desc = document.getElementById('exDesc').value.trim();
      const notes = document.getElementById('exNotes').value.trim();
      const payload = {
        date: document.getElementById('exDate').value,
        description: notes ? desc + ' \u2014 ' + notes : desc,
        amount: Number(document.getElementById('exAmt').value)
      };
      try {
        await EDY.api.post('/api/ledger/expenses', payload);
        EDY.ui.closeModal('expModal');
        EDY.ui.toast('Expense recorded');
        entries = await EDY.api.get('/api/ledger').catch(() => []);
        location.reload();
      } catch (err) { EDY.ui.toast(err.message, 'error'); }
    });

    document.getElementById('typeFilter').addEventListener('change', render);

    document.getElementById('btnPrint').addEventListener('click', printList);

    document.getElementById('btnCsv').addEventListener('click', () => {
      const expenses = entries.filter(e => e.type === 'EXPENSE');
      const head = 'Date,Description,Source,Reference,Amount';
      const rows = expenses.map(e => [e.entryDate, e.description || '', e.referenceType || '', e.referenceId || '', EDY.fmt.amount(e.amount)]
        .map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','));
      const blob = new Blob(['\ufeff' + head + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'expenses.csv'; a.click();
    });

    entries = await EDY.api.get('/api/ledger').catch(() => []);
    render();
    if (new URLSearchParams(location.search).get('new')) {
      document.getElementById('exDesc').value = '';
      document.getElementById('exDate').value = today;
      document.getElementById('exAmt').value = '';
      document.getElementById('exNotes').value = '';
      EDY.ui.openModal('expModal');
    }
  }
};