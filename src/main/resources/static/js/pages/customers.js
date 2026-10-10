/* EDY ERP — Customers */
window.PAGE = {
  init: async function () {
    const box = document.getElementById('pageContent');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    let customers = [], sales = [];
    let table = null;

    box.innerHTML =
      '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">' +
      '<div><h1 class="page-title mb-1">Customers</h1><div class="page-sub">Customer directory and purchase history</div></div>' +
      '<button class="btn btn-primary" id="btnAdd"><i class="bi bi-person-plus me-1"></i>Add Customer</button>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-body">' +
      '<div class="d-flex flex-wrap gap-2 mb-3">' +
      '<div class="topbar-search" style="max-width:320px"><i class="bi bi-search"></i><input id="tblSearch" placeholder="Search name, email, phone&hellip;"></div>' +
      '<button class="btn btn-ghost me-auto" id="btnImport"><i class="bi bi-upload me-1"></i>Import</button>' +
      '<button class="btn btn-ghost ms-auto" id="btnCsv"><i class="bi bi-download me-1"></i>CSV</button>' +
      '</div>' +
      '<div class="table-wrap"><table class="table" id="cTable"></table></div>' +
      '</div></div>';

    function stats(id) {
      const custSales = sales.filter(s => s.status !== 'CANCELLED' && s.customer && s.customer.id === id);
      return { count: custSales.length, total: custSales.reduce((s, x) => s + Number(x.totalAmount || 0), 0) };
    }

    function render() {
      const enriched = customers.map(c => { const st = stats(c.id); return { ...c, ...st }; });
      table = EDY.ui.table({
        el: document.getElementById('cTable'),
        searchInput: document.getElementById('tblSearch'),
        data: enriched,
        pageSize: 12,
        columns: [
          { key: 'name', label: 'Customer', render: (r) =>
            '<div class="d-flex align-items-center gap-2">' + EDY.avatar(r.name, 36) + '<div><div class="fw-bold">' + esc(r.name) + '</div><div class="muted fs-12">' + esc(r.email || r.phone || '') + '</div></div></div>' },
          { key: 'phone', label: 'Phone', render: (r) => esc(r.phone || '\u2014') },
          { key: 'address', label: 'Address', render: (r) => r.address ? '<span class="muted fs-13">' + esc(r.address.length > 40 ? r.address.substring(0, 40) + '...' : r.address) + '</span>' : '\u2014' },
          { key: 'count', label: 'Orders', render: (r) => '<span class="fw-bold">' + r.count + '</span>' },
          { key: 'total', label: 'Total Spent', render: (r) => '<span class="fw-bold text-green">' + EDY.fmt.money(r.total) + '</span>' },
          { key: 'id', label: 'Actions', render: (r) =>
            '<button class="btn btn-soft-primary btn-icon me-1" data-view="' + r.id + '" title="View detail"><i class="bi bi-eye"></i></button>' +
            '<button class="btn btn-ghost btn-icon me-1" data-print="' + r.id + '" title="Preview and print"><i class="bi bi-printer"></i></button>' +
            '<button class="btn btn-ghost btn-icon me-1" data-edit="' + r.id + '" title="Edit"><i class="bi bi-pencil"></i></button>' +
            '<button class="btn btn-soft-danger btn-icon" data-del="' + r.id + '" title="Delete"><i class="bi bi-trash"></i></button>' }
        ]
      });
      box.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => showDetail(Number(b.dataset.view))));
      box.querySelectorAll('[data-print]').forEach(b => b.addEventListener('click', () => printCustomer(Number(b.dataset.print))));
      box.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openEdit(Number(b.dataset.edit))));
      box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => remove(Number(b.dataset.del))));
    }

    /**
     * A customer print is a statement: who they are, what they have bought, and
     * what that came to. Printing only the contact block would leave out the half
     * of the record someone actually asks for.
     */
    function printCustomer(id) {
      const c = customers.find(x => x.id === id);
      if (!c) return;
      const st = stats(id);
      const custSales = sales
        .filter(s => s.status !== 'CANCELLED' && s.customer && s.customer.id === id)
        .sort((a, b) => (b.id || 0) - (a.id || 0));
      const statement = EDY.print.list('Order history', [
        { label: 'Invoice' },
        { label: 'Date' },
        { label: 'Total', align: 'r' },
        { label: 'Payment' }
      ], custSales.map(s => [
        esc(s.invoiceNumber),
        esc(s.invoiceDate || '\u2014'),
        esc(EDY.fmt.money(s.totalAmount)),
        esc(s.paymentMethod || 'CASH')
      ]), {
        bare: true,
        summary: [
          { label: 'Orders', value: String(st.count) },
          { label: 'Total spent', value: EDY.fmt.money(st.total) },
          { label: 'Average order', value: EDY.fmt.money(st.count ? st.total / st.count : 0), bold: true }
        ]
      });

      EDY.print.preview({
        title: c.name,
        subtitle: 'Customer statement',
        html: EDY.print.record('Customer statement', c.name, [
          ['Name', c.name],
          ['Phone', c.phone || '\u2014'],
          ['Email', c.email || '\u2014'],
          ['Address', c.address || '\u2014'],
          ['Notes', c.notes || '\u2014'],
          ['Total orders', String(st.count)],
          ['Total spent', EDY.fmt.money(st.total)]
        ], {
          bodyLabel: 'Order history',
          body: custSales.length ? statement
            : '<div class="pr-muted" style="font-size:12px;color:#64748b">No orders yet.</div>'
        })
      });
    }

    function fillForm(c) {
      document.getElementById('cId').value = c ? c.id : '';
      document.getElementById('cName').value = c ? c.name || '' : '';
      document.getElementById('cPhone').value = c ? c.phone || '' : '';
      document.getElementById('cEmail').value = c ? c.email || '' : '';
      document.getElementById('cAddr').value = c ? c.address || '' : '';
      document.getElementById('cNotes').value = c ? c.notes || '' : '';
      document.getElementById('cmTitle').textContent = c ? 'Edit Customer' : 'Add Customer';
    }

    function openEdit(id) { fillForm(customers.find(x => x.id === id)); EDY.ui.openModal('custModal'); }
    async function remove(id) {
      const c = customers.find(x => x.id === id);
      const ok = await EDY.ui.confirm('Delete customer?', 'Delete "' + c.name + '"? This cannot be undone.');
      if (!ok) return;
      try { await EDY.api.del('/api/customers/' + id); customers = customers.filter(x => x.id !== id); render(); EDY.ui.toast('Customer deleted'); }
      catch (e) { EDY.ui.toast(e.message, 'error'); }
    }

    function showDetail(id) {
      const c = customers.find(x => x.id === id);
      if (!c) return;
      const st = stats(id);
      const custSales = sales.filter(s => s.status !== 'CANCELLED' && s.customer && s.customer.id === id).sort((a, b) => (b.id || 0) - (a.id || 0));
      const orderRows = custSales.map(s =>
        '<tr><td>' + esc(s.invoiceNumber) + '</td><td>' + (s.invoiceDate || '\u2014') + '</td><td>' + EDY.fmt.money(s.totalAmount) + '</td><td>' + esc(s.paymentMethod || 'CASH') + '</td></tr>'
      ).join('') || '<tr><td colspan="4" class="muted text-center">No orders yet</td></tr>';
      document.getElementById('detailBody').innerHTML =
        '<div class="row mb-4"><div class="col-3 text-center">' + EDY.avatar(c.name, 64) + '</div>' +
        '<div class="col-9"><h4 class="fw-bold">' + esc(c.name) + '</h4>' +
        '<div class="muted fs-13">' + esc(c.email || 'No email') + ' &middot; ' + esc(c.phone || 'No phone') + '</div>' +
        '<div class="muted fs-13">' + esc(c.address || 'No address') + '</div>' +
        (c.notes ? '<div class="mt-2 p-2 rounded bg-soft-gray fs-13">' + esc(c.notes) + '</div>' : '') + '</div></div>' +
        '<div class="row g-3 mb-4">' +
        '<div class="col-4 text-center"><div class="fw-bold fs-5">' + st.count + '</div><div class="muted fs-13">Total Orders</div></div>' +
        '<div class="col-4 text-center"><div class="fw-bold fs-5 text-green">' + EDY.fmt.money(st.total) + '</div><div class="muted fs-13">Total Spent</div></div>' +
        '<div class="col-4 text-center"><div class="fw-bold fs-5">' + EDY.fmt.money(st.count ? st.total / st.count : 0) + '</div><div class="muted fs-13">Avg. Order</div></div>' +
        '</div>' +
        '<h6 class="fw-bold mb-2">Order History</h6>' +
        '<table class="table"><thead><tr><th>Invoice</th><th>Date</th><th>Total</th><th>Payment</th></tr></thead><tbody>' + orderRows + '</tbody></table>';
      EDY.ui.openModal('detailModal');
    }

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
      const iName = idx('name'), iPhone = idx('phone'), iEmail = idx('email'), iAddr = idx('address'), iNotes = idx('notes');
      if (iName < 0) { EDY.ui.toast('CSV must have a "Name" column', 'error'); e.target.value = ''; return; }
      let ok = 0, fail = 0;
      for (const line of lines.slice(1)) {
        const c = parse(line);
        if (!(c[iName] || '').trim()) { fail++; continue; }
        try {
          await EDY.api.post('/api/customers', {
            name: c[iName].trim(),
            phone: iPhone >= 0 && c[iPhone] ? c[iPhone].trim() : null,
            email: iEmail >= 0 && c[iEmail] ? c[iEmail].trim() : null,
            address: iAddr >= 0 && c[iAddr] ? c[iAddr].trim() : null,
            notes: iNotes >= 0 && c[iNotes] ? c[iNotes].trim() : null
          });
          ok++;
        } catch (err) { fail++; }
      }
      e.target.value = '';
      EDY.ui.toast((ok ? ok + ' customers imported' : '') + (fail ? ', ' + fail + ' failed' : ''), fail ? 'warning' : 'success');
      customers = await EDY.api.get('/api/customers');
      render();
    });

    document.getElementById('btnAdd').addEventListener('click', () => { fillForm(null); EDY.ui.openModal('custModal'); });
    document.getElementById('custForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('cId').value;
      const payload = { name: document.getElementById('cName').value.trim(), phone: document.getElementById('cPhone').value.trim() || null, email: document.getElementById('cEmail').value.trim() || null, address: document.getElementById('cAddr').value.trim() || null, notes: document.getElementById('cNotes').value.trim() || null };
      try {
        if (id) { await EDY.api.put('/api/customers/' + id, payload); EDY.ui.toast('Customer updated'); }
        else { await EDY.api.post('/api/customers', payload); EDY.ui.toast('Customer created'); }
        EDY.ui.closeModal('custModal');
        customers = await EDY.api.get('/api/customers');
        render();
      } catch (err) { EDY.ui.toast(err.message, 'error'); }
    });

    document.getElementById('btnCsv').addEventListener('click', () => {
      const head = 'Name,Phone,Email,Address,Orders,Total Spent';
      const rows = customers.map(c => { const st = stats(c.id); return [c.name, c.phone || '', c.email || '', c.address || '', st.count, EDY.fmt.amount(st.total)].map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','); });
      const blob = new Blob(['\ufeff' + head + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'customers.csv'; a.click();
    });

    [customers, sales] = await Promise.all([
      EDY.api.get('/api/customers').catch(() => []),
      EDY.api.get('/api/sales-invoices').catch(() => [])
    ]);
    render();
    if (new URLSearchParams(location.search).get('new')) { fillForm(null); EDY.ui.openModal('custModal'); }
  }
};