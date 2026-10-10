/* EDY ERP — Suppliers */
window.PAGE = {
  init: async function () {
    const box = document.getElementById('pageContent');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    let suppliers = [], purchases = [];

    box.innerHTML =
      '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">' +
      '<div><h1 class="page-title mb-1">Suppliers</h1><div class="page-sub">Vendors directory and purchase history</div></div>' +
      '<button class="btn btn-primary" id="btnAdd"><i class="bi bi-building me-1"></i>Add Supplier</button>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-body">' +
      '<div class="d-flex flex-wrap gap-2 mb-3">' +
      '<div class="topbar-search" style="max-width:320px"><i class="bi bi-search"></i><input id="tblSearch" placeholder="Search suppliers&hellip;"></div>' +
      '<button class="btn btn-ghost ms-auto" id="btnCsv"><i class="bi bi-download me-1"></i>CSV</button>' +
      '</div>' +
      '<div class="table-wrap"><table class="table" id="sTable"></table></div>' +
      '</div></div>';

    function stats(id) {
      const ps = purchases.filter(p => p.supplier && p.supplier.id === id && p.status !== 'CANCELLED');
      return { count: ps.length, total: ps.reduce((s, x) => s + Number(x.totalAmount || 0), 0) };
    }

    function render() {
      const enriched = suppliers.map(s => ({ ...s, ...stats(s.id) }));
      EDY.ui.table({
        el: document.getElementById('sTable'),
        searchInput: document.getElementById('tblSearch'),
        data: enriched,
        pageSize: 12,
        columns: [
          { key: 'name', label: 'Supplier', render: (r) => EDY.avatar(r.name, 36).replace('SM', esc(r.name.substring(0, 2).toUpperCase())) + '<div class="ms-2 fw-bold">' + esc(r.name) + '<div class="muted fs-12">' + esc(r.email || r.phone || '') + '</div></div>' },
          { key: 'phone', label: 'Phone', render: (r) => esc(r.phone || '\u2014') },
          { key: 'address', label: 'Address', render: (r) => r.address ? '<span class="muted fs-13">' + esc(r.address.length > 40 ? r.address.substring(0, 40) + '...' : r.address) + '</span>' : '\u2014' },
          { key: 'count', label: 'Orders', render: (r) => '<span class="fw-bold">' + r.count + '</span>' },
          { key: 'total', label: 'Total Purchases', render: (r) => '<span class="fw-bold text-blue">' + EDY.fmt.money(r.total) + '</span>' },
          { key: 'id', label: 'Actions', render: (r) =>
            '<button class="btn btn-soft-primary btn-icon me-1" data-view="' + r.id + '" title="View"><i class="bi bi-eye"></i></button>' +
            '<button class="btn btn-ghost btn-icon me-1" data-print="' + r.id + '" title="Preview and print"><i class="bi bi-printer"></i></button>' +
            '<button class="btn btn-ghost btn-icon me-1" data-edit="' + r.id + '" title="Edit"><i class="bi bi-pencil"></i></button>' +
            '<button class="btn btn-soft-danger btn-icon" data-del="' + r.id + '" title="Delete"><i class="bi bi-trash"></i></button>' }
        ]
      });
      box.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => showDetail(Number(b.dataset.view))));
      box.querySelectorAll('[data-print]').forEach(b => b.addEventListener('click', () => printSupplier(Number(b.dataset.print))));
      box.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openEdit(Number(b.dataset.edit))));
      box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => remove(Number(b.dataset.del))));
    }

    /** Total of a purchase as stored, falling back to the lines if it never saved one. */
    function poTotal(p) {
      const stored = Number(p.totalAmount);
      if (Number.isFinite(stored)) return stored;
      return (p.items || []).reduce((s, it) => s + Number(it.unitCost || 0) * Number(it.quantity || 0), 0);
    }

    /** The supplier and what has been bought from them, as one page. */
    function printSupplier(id) {
      const s = suppliers.find(x => x.id === id);
      if (!s) return;
      const st = stats(id);
      const ps = purchases.filter(p => p.supplier && p.supplier.id === id).sort((a, b) => (b.id || 0) - (a.id || 0));
      const history = EDY.print.list('Purchase history', [
        { label: 'Order' },
        { label: 'Date' },
        { label: 'Total', align: 'r' },
        { label: 'Status' }
      ], ps.map(p => [
        'PO-' + String(p.id).padStart(4, '0'),
        esc(p.invoiceDate || '\u2014'),
        esc(EDY.fmt.money(poTotal(p))),
        esc(p.status || 'DRAFT')
      ]), {
        bare: true,
        summary: [
          { label: 'Orders', value: String(st.count) },
          { label: 'Total purchases', value: EDY.fmt.money(st.total), bold: true }
        ]
      });

      EDY.print.preview({
        title: s.name,
        subtitle: 'Supplier record',
        html: EDY.print.record('Supplier record', s.name, [
          ['Name', s.name],
          ['Phone', s.phone || '\u2014'],
          ['Email', s.email || '\u2014'],
          ['Address', s.address || '\u2014'],
          ['Notes', s.notes || '\u2014'],
          ['Total orders', String(st.count)],
          ['Total purchases', EDY.fmt.money(st.total)]
        ], {
          bodyLabel: 'Purchase history',
          body: ps.length ? history
            : '<div style="font-size:12px;color:#64748b">No purchase orders yet.</div>'
        })
      });
    }

    function fillForm(s) {
      document.getElementById('sId').value = s ? s.id : '';
      document.getElementById('sName').value = s ? s.name || '' : '';
      document.getElementById('sPhone').value = s ? s.phone || '' : '';
      document.getElementById('sEmail').value = s ? s.email || '' : '';
      document.getElementById('sAddr').value = s ? s.address || '' : '';
      document.getElementById('sNotes').value = s ? s.notes || '' : '';
      document.getElementById('smTitle').textContent = s ? 'Edit Supplier' : 'Add Supplier';
    }

    function openEdit(id) { fillForm(suppliers.find(x => x.id === id)); EDY.ui.openModal('supModal'); }
    async function remove(id) {
      const s = suppliers.find(x => x.id === id);
      const ok = await EDY.ui.confirm('Delete supplier?', 'Delete "' + s.name + '"? This cannot be undone.');
      if (!ok) return;
      try { await EDY.api.del('/api/suppliers/' + id); suppliers = suppliers.filter(x => x.id !== id); render(); EDY.ui.toast('Supplier deleted'); }
      catch (e) { EDY.ui.toast(e.message, 'error'); }
    }

    function showDetail(id) {
      const s = suppliers.find(x => x.id === id);
      if (!s) return;
      const st = stats(id);
      const ps = purchases.filter(p => p.supplier && p.supplier.id === id).sort((a, b) => (b.id || 0) - (a.id || 0));
      const rows = ps.map(p =>
        '<tr><td>PO-' + String(p.id).padStart(4, '0') + '</td><td>' + (p.invoiceDate || '\u2014') + '</td><td>' + EDY.fmt.money(p.totalAmount) + '</td><td>' + (p.status || 'DRAFT') + '</td></tr>'
      ).join('') || '<tr><td colspan="4" class="muted text-center">No purchase orders yet</td></tr>';
      document.getElementById('detailBody2').innerHTML =
        '<div class="row mb-4"><div class="col-3 text-center">' + EDY.avatar(s.name, 64).replace('SM', s.name.substring(0, 2).toUpperCase()) + '</div>' +
        '<div class="col-9"><h4 class="fw-bold">' + esc(s.name) + '</h4>' +
        '<div class="muted fs-13">' + esc(s.email || 'No email') + ' &middot; ' + esc(s.phone || 'No phone') + '</div>' +
        '<div class="muted fs-13">' + esc(s.address || 'No address') + '</div>' +
        (s.notes ? '<div class="mt-2 p-2 rounded bg-soft-gray fs-13">' + esc(s.notes) + '</div>' : '') + '</div></div>' +
        '<div class="row g-3 mb-4">' +
        '<div class="col-4 text-center"><div class="fw-bold fs-5">' + st.count + '</div><div class="muted fs-13">Total Orders</div></div>' +
        '<div class="col-4 text-center"><div class="fw-bold fs-5 text-blue">' + EDY.fmt.money(st.total) + '</div><div class="muted fs-13">Total Purchases</div></div>' +
        '<div class="col-4 text-center"><div class="fw-bold fs-5">' + EDY.fmt.money(st.count ? st.total / st.count : 0) + '</div><div class="muted fs-13">Avg. Order</div></div>' +
        '</div>' +
        '<h6 class="fw-bold mb-2">Purchase History</h6>' +
        '<table class="table"><thead><tr><th>PO</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>';
      EDY.ui.openModal('detailModal2');
    }

    document.getElementById('btnAdd').addEventListener('click', () => { fillForm(null); EDY.ui.openModal('supModal'); });
    document.getElementById('supForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('sId').value;
      const payload = { name: document.getElementById('sName').value.trim(), phone: document.getElementById('sPhone').value.trim() || null, email: document.getElementById('sEmail').value.trim() || null, address: document.getElementById('sAddr').value.trim() || null, notes: document.getElementById('sNotes').value.trim() || null };
      try {
        if (id) { await EDY.api.put('/api/suppliers/' + id, payload); EDY.ui.toast('Supplier updated'); }
        else { await EDY.api.post('/api/suppliers', payload); EDY.ui.toast('Supplier created'); }
        EDY.ui.closeModal('supModal');
        suppliers = await EDY.api.get('/api/suppliers');
        render();
      } catch (err) { EDY.ui.toast(err.message, 'error'); }
    });

    document.getElementById('btnCsv').addEventListener('click', () => {
      const head = 'Name,Phone,Email,Address,Orders,Total Purchases';
      const rows = suppliers.map(s => { const st = stats(s.id); return [s.name, s.phone || '', s.email || '', s.address || '', st.count, EDY.fmt.amount(st.total)].map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','); });
      const blob = new Blob(['\ufeff' + head + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'suppliers.csv'; a.click();
    });

    [suppliers, purchases] = await Promise.all([
      EDY.api.get('/api/suppliers').catch(() => []),
      EDY.api.get('/api/purchase-invoices').catch(() => [])
    ]);
    render();
    if (new URLSearchParams(location.search).get('new')) { fillForm(null); EDY.ui.openModal('supModal'); }
  }
};