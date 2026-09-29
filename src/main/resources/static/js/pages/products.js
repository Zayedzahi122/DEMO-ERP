/* EDY ERP — Products */
window.PAGE = {
  init: async function () {
    const box = document.getElementById('pageContent');
    const money = (v) => EDY.fmt.money(v);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    let products = [];
    let categories = [];
    let table = null;
    let activeCat = '';
    let currentStockId = null;

    box.innerHTML =
      '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">' +
      '<div><h1 class="page-title mb-1">Products</h1><div class="page-sub">Manage your catalog, pricing and stock levels</div></div>' +
      '<div class="toolbar">' +
      '<button class="btn btn-ghost" id="btnExport"><i class="bi bi-download me-1"></i>Export</button>' +
      '<button class="btn btn-ghost" id="btnImport"><i class="bi bi-upload me-1"></i>Import</button>' +
      '<button class="btn btn-primary" id="btnAdd"><i class="bi bi-plus-lg me-1"></i>Add Product</button>' +
      '</div></div>' +

      '<div class="d-flex gap-3 align-items-start flex-wrap">' +

      '<div class="card cat-sidebar">' +
      '<div class="card-body">' +
      '<h6 class="fw-bold mb-3 d-flex justify-content-between align-items-center"><span>Categories</span></h6>' +
      '<div class="input-group input-group-sm mb-2">' +
      '<input class="form-control" id="catName" placeholder="New category">' +
      '<button class="btn btn-primary" id="btnAddCat" type="button"><i class="bi bi-plus-lg"></i></button>' +
      '</div>' +
      '<ul class="list-group list-group-flush" id="catList"></ul>' +
      '</div></div>' +

      '<div class="card flex-grow-1" style="min-width:0">' +
      '<div class="card-body">' +
      '<div class="d-flex flex-wrap gap-2 mb-3">' +
      '<div class="topbar-search" style="max-width:320px"><i class="bi bi-search"></i><input id="tblSearch" placeholder="Search products&hellip;"></div>' +
      '<select class="form-select w-auto" id="stockFilter"><option value="">All Stock</option><option value="low">Low / Out of stock</option><option value="in">In stock</option></select>' +
      '' +
      '' +
            '<span class="fs-13 muted" style="white-space:nowrap">Show</span>' +
      '<select class="form-select w-auto" id="pageSizeFilter" title="Rows per page"><option value="10" selected>10 entries</option><option value="20">20 entries</option><option value="30">30 entries</option><option value="all">All entries</option></select>' +
      '<span class="fs-13 muted" style="white-space:nowrap">entries</span>' +
      '' +
      '</div>' +
      '<div class="table-wrap"><table class="table" id="pTable"></table></div>' +
      '</div></div>' +

      '</div>';

    function loadCategories() {
      const sel = document.getElementById('pCat');
      sel.innerHTML = '<option value="">None</option>' + categories.map(c => '<option value="' + c.id + '"' + (activeCat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');
    }

    function renderForm(p, cats) {
      document.getElementById('pId').value = p ? p.id : '';
      document.getElementById('pName').value = p ? p.name || '' : '';
      const skuInput = document.getElementById('pSku');
      skuInput.value = p ? p.sku || '' : '';
      skuInput.disabled = !p;
      skuInput.placeholder = p ? '' : 'Auto-generated';
      document.getElementById('pBarcode').value = p ? p.barcode || '' : '';
      document.getElementById('pDesc').value = p ? p.description || '' : '';
      document.getElementById('pCat').innerHTML = '<option value="">None</option>' + cats.map(c => '<option value="' + c.id + '"' + (p && p.category && p.category.id === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');
      document.getElementById('pCost').value = p ? p.costPrice : '';
      document.getElementById('pPrice').value = p ? p.unitPrice : '';
      document.getElementById('pStock').value = p ? p.quantityInStock : 0;
      document.getElementById('pReorder').value = p ? p.reorderLevel : 10;
      document.getElementById('pmTitle').textContent = p ? 'Edit Product' : 'Add Product';
    }

    async function openAdd() {
      renderForm(null, categories);
      const d = await EDY.api.get('/api/products/next-sku').catch(() => null);
      if (d && d.sku) document.getElementById('pSku').value = d.sku;
      EDY.ui.openModal('productModal');
    }

    function stockBadge(p) {
      if (p.quantityInStock <= 0) return '<span class="badge bg-soft-red">Out of stock</span>';
      if (p.quantityInStock <= (p.reorderLevel || 0)) return '<span class="badge bg-soft-amber">Low</span>';
      return '<span class="badge bg-soft-green">In stock</span>';
    }

    function renderCatList() {
      const el = document.getElementById('catList');
      const counts = {};
      products.forEach(p => { if (p.category) counts[p.category.id] = (counts[p.category.id] || 0) + 1; });
      el.innerHTML =
        '<li class="list-group-item list-group-item-action cat-item d-flex justify-content-between align-items-center' + (activeCat === '' ? ' active' : '') + '" data-cat="" style="cursor:pointer">' +
        '<span><i class="bi bi-grid me-2"></i>All</span><span class="badge rounded-pill">' + products.length + '</span></li>' +
        categories.map(c =>
          '<li class="list-group-item list-group-item-action cat-item d-flex justify-content-between align-items-center' + (activeCat === c.id ? ' active' : '') + '" data-cat="' + c.id + '" style="cursor:pointer">' +
          '<span class="text-truncate" style="max-width:130px"><i class="bi bi-folder me-2"></i>' + esc(c.name) + '</span>' +
          '<span class="d-flex align-items-center gap-1 flex-shrink-0">' +
          '<span class="badge rounded-pill">' + (counts[c.id] || 0) + '</span>' +
          '<button class="btn btn-sm p-0 border-0 text-danger" data-delcat="' + c.id + '" title="Delete category"><i class="bi bi-trash"></i></button>' +
          '</span></li>'
        ).join('');
      el.querySelectorAll('[data-cat]').forEach(item => item.addEventListener('click', () => { activeCat = item.dataset.cat; renderCatList(); applyFilters(); }));
      el.querySelectorAll('[data-delcat]').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); deleteCategory(Number(btn.dataset.delcat)); }));
    }

    async function addCategory() {
      const name = document.getElementById('catName').value.trim();
      if (!name) { EDY.ui.toast('Enter a category name first', 'warning'); return; }
      try {
        const created = await EDY.api.post('/api/categories', { name: name, description: name });
        categories.push(created);
        document.getElementById('catName').value = '';
        renderCatList(); loadCategories();
        EDY.ui.toast('Category added');
      } catch (e) { EDY.ui.toast(e.message, 'error'); }
    }

    async function deleteCategory(id) {
      const cat = categories.find(c => c.id === id);
      if (!cat) return;
      const used = products.filter(p => p.category && p.category.id === id).length;
      if (used > 0) { EDY.ui.toast('Cannot delete "' + cat.name + '" — ' + used + ' product(s) are still assigned to it.', 'warning'); return; }
      const ok = await EDY.ui.confirm('Delete category?', 'Delete "' + cat.name + '"? No products reference it, so nothing else is affected.');
      if (!ok) return;
      try {
        await EDY.api.del('/api/categories/' + id);
        categories = categories.filter(c => c.id !== id);
        if (activeCat === id) activeCat = '';
        renderCatList(); loadCategories(); applyFilters();
        EDY.ui.toast('Category deleted');
      } catch (e) { EDY.ui.toast(e.message, 'error'); }
    }

    function renderTable() {
      const psRaw = (document.getElementById('pageSizeFilter') || {}).value || '10';
      const ps = psRaw === 'all' ? 1000000 : Number(psRaw) || 12;
      table = EDY.ui.table({
        el: document.getElementById('pTable'),
        searchInput: document.getElementById('tblSearch'),
        data: products,
        pageSize: ps,
        columns: [
          { key: 'name', label: 'Product', render: (r) =>
            '<div class="d-flex align-items-center gap-2"><div class="product-thumb"><i class="bi bi-box-seam"></i></div>' +
            '<div><div class="fw-bold">' + esc(r.name) + '</div><div class="muted fs-12">' + esc(r.sku || '') + ' &middot; ' + (r.barcode || 'no barcode') + '</div></div></div>' },
          { key: 'category', label: 'Category', render: (r) => r.category ? '<span class="badge bg-soft-blue">' + esc(r.category.name) + '</span>' : '\u2014' },
          { key: 'costPrice', label: 'Purchase', money: true },
          { key: 'unitPrice', label: 'Selling', money: true },
          { key: 'vat', label: 'VAT', render: () => '<span class="badge bg-soft-purple">5%</span>' },
          { key: 'quantityInStock', label: 'Stock', render: (r) => '<span class="fw-bold">' + EDY.fmt.num(r.quantityInStock) + '</span>' },
          { key: 'reorderLevel', label: 'Min', render: (r) => EDY.fmt.num(r.reorderLevel || 0) },
          { key: 'status', label: 'Status', render: (r) => stockBadge(r) },
          { key: 'id', label: 'Actions', render: (r) =>
            '<div class="dropdown">' +
            '<button class="btn btn-primary btn-sm dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">Actions</button>' +
            '<ul class="dropdown-menu dropdown-menu-end">' +
            '<li><a class="dropdown-item" href="#" data-view="' + r.id + '"><i class="bi bi-eye me-2"></i>View</a></li>' +
            '<li><a class="dropdown-item" href="#" data-edit="' + r.id + '"><i class="bi bi-pencil me-2"></i>Edit</a></li>' +
            '<li><a class="dropdown-item" href="#" data-stock="' + r.id + '"><i class="bi bi-box-arrow-in-down me-2"></i>Add Opening Stock</a></li>' +
            '<li><hr class="dropdown-divider"></li>' +
            '<li><a class="dropdown-item text-danger" href="#" data-del="' + r.id + '"><i class="bi bi-trash me-2"></i>Delete</a></li>' +
            '</ul></div>' }
        ],
        emptyText: 'No products yet. Click "Add Product" to create your first one.'
      });
    }

    document.getElementById('pTable').addEventListener('click', function (e) {
      const v = e.target.closest('[data-view]');
      const ed = e.target.closest('[data-edit]');
      const st = e.target.closest('[data-stock]');
      const dl = e.target.closest('[data-del]');
      if (v) { e.preventDefault(); openView(Number(v.dataset.view)); }
      else if (ed) { e.preventDefault(); openEdit(Number(ed.dataset.edit)); }
      else if (st) { e.preventDefault(); openStock(Number(st.dataset.stock)); }
      else if (dl) { e.preventDefault(); remove(Number(dl.dataset.del)); }
    });

    function openView(id) {
      const p = products.find(x => x.id === id);
      if (!p) return;
      const row = (label, val) => '<div class="d-flex justify-content-between border-bottom py-2 gap-3"><span class="muted">' + label + '</span><span class="fw-semibold text-end">' + val + '</span></div>';
      document.getElementById('pvBody').innerHTML =
        row('SKU', esc(p.sku || '\u2014')) +
        row('Barcode', esc(p.barcode || '\u2014')) +
        row('Name', esc(p.name)) +
        row('Category', p.category ? esc(p.category.name) : '\u2014') +
        row('Description', esc(p.description || '\u2014')) +
        row('Purchase Price', money(p.costPrice)) +
        row('Selling Price', money(p.unitPrice)) +
        row('VAT', '5%') +
        row('Stock Qty', EDY.fmt.num(p.quantityInStock)) +
        row('Reorder Level', EDY.fmt.num(p.reorderLevel || 0)) +
        row('Status', stockBadge(p));
      EDY.ui.openModal('productViewModal');
    }

    function openStock(id) {
      currentStockId = id;
      const p = products.find(x => x.id === id);
      document.getElementById('osInfo').innerHTML =
        '<div class="fw-bold">' + esc(p.name) + '</div><div class="muted fs-13">' + esc(p.sku || '') +
        ' &middot; Current stock: <span class="fw-semibold">' + EDY.fmt.num(p.quantityInStock) + '</span></div>';
      document.getElementById('osQty').value = '';
      EDY.ui.openModal('stockModal');
      document.getElementById('osQty').focus();
    }

    async function saveStock() {
      const qty = Number(document.getElementById('osQty').value);
      if (!qty || qty <= 0) { EDY.ui.toast('Enter a quantity greater than zero', 'warning'); return; }
      try {
        await EDY.api.post('/api/products/' + currentStockId + '/adjust', { delta: qty, note: 'Opening stock' });
        EDY.ui.closeModal('stockModal');
        EDY.ui.toast('Opening stock added');
        products = await EDY.api.get('/api/products');
        renderCatList(); applyFilters();
      } catch (e) { EDY.ui.toast(e.message, 'error'); }
    }

    function applyFilters() {
      const stock = document.getElementById('stockFilter').value;
      let list = products;
      if (activeCat) list = list.filter(p => p.category && p.category.id === activeCat);
      if (stock === 'low') list = list.filter(p => p.quantityInStock <= (p.reorderLevel || 0));
      if (stock === 'in') list = list.filter(p => p.quantityInStock > (p.reorderLevel || 0));
      if (table) table.refresh(list); else renderTable();
      table.search(document.getElementById('tblSearch').value);
    }

    function openEdit(id) {
      const p = products.find(x => x.id === id);
      renderForm(p, categories);
      EDY.ui.openModal('productModal');
    }

    async function remove(id) {
      const p = products.find(x => x.id === id);
      const ok = await EDY.ui.confirm('Delete product?', 'Delete "' + p.name + '" from your catalog? This cannot be undone.');
      if (!ok) return;
      try {
        await EDY.api.del('/api/products/' + id);
        products = products.filter(x => x.id !== id);
        renderCatList(); applyFilters();
        EDY.ui.toast('Product deleted');
      } catch (e) { EDY.ui.toast(e.message, 'error'); }
    }

    document.getElementById('btnAdd').addEventListener('click', openAdd);
    document.getElementById('btnAddCat').addEventListener('click', addCategory);
    document.getElementById('catName').addEventListener('keydown', (e) => { if (e.key === 'Enter') addCategory(); });
    document.getElementById('btnSaveStock').addEventListener('click', saveStock);
    document.getElementById('stockFilter').addEventListener('change', applyFilters);
    const psf = document.getElementById('pageSizeFilter');
    if (psf) psf.addEventListener('change', () => { renderTable(); applyFilters(); });

    document.getElementById('productForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('pId').value;
      const catVal = document.getElementById('pCat').value;
      const payload = {
        sku: document.getElementById('pSku').value.trim(),
        name: document.getElementById('pName').value.trim(),
        description: document.getElementById('pDesc').value.trim() || null,
        barcode: document.getElementById('pBarcode').value.trim() || null,
        category: catVal ? { id: Number(catVal) } : null,
        costPrice: Number(document.getElementById('pCost').value),
        unitPrice: Number(document.getElementById('pPrice').value),
        quantityInStock: Number(document.getElementById('pStock').value),
        reorderLevel: Number(document.getElementById('pReorder').value || 10)
      };
      try {
        if (id) { await EDY.api.put('/api/products/' + id, payload); EDY.ui.toast('Product updated'); }
        else { await EDY.api.post('/api/products', payload); EDY.ui.toast('Product created'); }
        EDY.ui.closeModal('productModal');
        products = await EDY.api.get('/api/products');
        renderCatList(); applyFilters();
      } catch (err) { EDY.ui.toast(err.message, 'error'); }
    });

    document.getElementById('btnExport').addEventListener('click', () => {
      const head = 'SKU,Name,Description,Category,PurchasePrice,SellingPrice,Stock,ReorderLevel';
      const rows = products.map(p => [p.sku, p.name, (p.description || ''), (p.category ? p.category.name : ''), p.costPrice, p.unitPrice, p.quantityInStock, p.reorderLevel || 0]
        .map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','));
      const blob = new Blob(['\ufeff' + head + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'products.csv'; a.click();
      EDY.ui.toast('Products exported to CSV');
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
      const [head, ...data] = lines;
      const norm = (s) => String(s).replace(/["\s_-]+/g, '').toLowerCase();
      const cells = head.split(',').map(x => norm(x));
      const idx = (...alts) => {
        for (let a = 0; a < alts.length; a++) {
          const i = cells.indexOf(norm(alts[a]));
          if (i >= 0) return i;
        }
        return -1;
      };
      const iSKU = idx('sku', 'productcode', 'code', 'itemcode'),
        iName = idx('name', 'productname', 'product', 'itemname', 'title'),
        iDesc = idx('description', 'desc'),
        iCat = idx('category', 'categoryname', 'cat'),
        iCost = idx('costprice', 'purchaseprice', 'cost', 'buyingprice', 'unitcost'),
        iPrice = idx('sellingprice', 'unitprice', 'price', 'sale price', 'retailprice'),
        iStock = idx('stock', 'quantityinstock', 'quantity', 'onhand', 'qty', 'stockqty'),
        iReorder = idx('reorderlevel', 'reorderlevel', 'minstock', 'lowstock', 'alertlevel'),
        iBrand = idx('brand', 'brandname'), iType = idx('producttype', 'type'), iLoc = idx('businesslocation', 'location', 'branch'),
        iTax = idx('tax', 'taxrate', 'vat'), iBarcode = idx('barcode');
      let ok = 0, fail = 0, firstErr = '';
      const existing = {};
      products.forEach(p => existing[p.sku] = p);
      for (const line of data) {
        const c = parse(line);
        const name = (iName >= 0 ? (c[iName] || '').trim() : '') || 'Unnamed product';
        try {
          const catName = iCat >= 0 ? c[iCat] : '';
          const cat = categories.find(x => x.name === catName) || null;
          const sku = iSKU >= 0 ? (c[iSKU] || '').trim() : '';
          const payload = {
            sku: sku, name: name,
            description: iDesc >= 0 ? c[iDesc] || null : null,
            barcode: iBarcode >= 0 ? (c[iBarcode] || '').trim() || null : null,
            category: cat ? { id: cat.id } : null,
            costPrice: Number(iCost >= 0 ? (c[iCost] || 0) : 0),
            unitPrice: Number(iPrice >= 0 ? (c[iPrice] || 0) : 0),
            quantityInStock: Number(iStock >= 0 ? (c[iStock] || 0) : 0),
            reorderLevel: Number(iReorder >= 0 ? (c[iReorder] || 10) : 10)
          };
          if (sku && existing[sku]) await EDY.api.put('/api/products/' + existing[sku].id, payload);
          else await EDY.api.post('/api/products', payload);
          ok++;
        } catch (err) { fail++; if (!firstErr) firstErr = (err && err.message) || String(err || 'import error'); }
      }
      e.target.value = '';
      EDY.ui.toast(
        (ok ? ok + ' products imported' : '') + (fail ? ', ' + fail + ' failed' : ''),
        fail ? 'warning' : 'success'
      );
      if (fail && firstErr) EDY.ui.toast('First error: ' + firstErr, 'warning');
      products = await EDY.api.get('/api/products');
      renderCatList(); applyFilters();
    });

    [products, categories] = await Promise.all([
      EDY.api.get('/api/products').catch(() => []),
      EDY.api.get('/api/categories').catch(() => [])
    ]);
    products = products || []; categories = categories || [];
    loadCategories();
    renderCatList();
    renderTable();
    applyFilters();

    if (new URLSearchParams(location.search).get('new')) openAdd();
  }
};