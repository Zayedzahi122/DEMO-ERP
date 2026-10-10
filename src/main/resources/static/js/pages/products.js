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

    /** True while a super admin is viewing every business at once. */
    function isSpanning() {
      const t = EDY.tenant && EDY.tenant.ctx;
      return !!(t && t.superAdmin && !t.actingBusiness);
    }

    /**
     * Writes are only allowed inside one business. When the session is still
     * "viewing all businesses" and the user targets a product, switch into that
     * product's business (then reload) instead of failing with a permission error.
     */
    async function ensureBusiness(id) {
      if (!isSpanning()) return true;
      const p = products.find(x => x.id === id);
      if (!p || !p.businessId) return false;
      try {
        await EDY.api.post('/api/businesses/' + p.businessId + '/enter');
        let bizName = 'that business';
        try {
          const list = await EDY.api.get('/api/businesses');
          const b = list.find(x => x.id === p.businessId);
          if (b && b.name) bizName = b.name;
        } catch (e) { /* name lookup is optional */ }
        EDY.ui.toast('Switched into ' + bizName + ' \u2014 reloading…', 'success');
        setTimeout(() => location.reload(), 700);
      } catch (e) { EDY.ui.toast(e.message, 'error'); }
      return false;
    }

    /** Warn when a write without a target business is attempted in spanning mode. */
    function warnSpanning() {
      if (!isSpanning()) return true;
      EDY.ui.toast("You're viewing every business \u2014 open one first.", 'warning');
      return false;
    }

    box.innerHTML =
      '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">' +
      '<div><h1 class="page-title mb-1">Products</h1><div class="page-sub">Manage your catalog, pricing and stock levels</div></div>' +
      '<div class="toolbar">' +
      '<button class="btn btn-ghost" id="btnExport"><i class="bi bi-download me-1"></i>Export</button>' +
      '<button class="btn btn-ghost" id="btnImport"><i class="bi bi-upload me-1"></i>Import</button>' +
      '<button class="btn btn-primary" id="btnAdd"><i class="bi bi-plus-lg me-1"></i>Add Product</button>' +
      '</div></div>' +
      '<input type="file" id="imgInput" accept="image/*" hidden>' +

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

    /** Selling price implied by the default profit percent from Settings. */
    function suggestPrice(cost) {
      const pct = Number(EDY.settings['biz.defaultProfit']);
      if (!cost || !Number.isFinite(pct) || pct <= 0) return '';
      return (Number(cost) * (1 + pct / 100)).toFixed(EDY.fmt.scale());
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
      document.getElementById('pPrice').value = p ? p.unitPrice : suggestPrice('');
      document.getElementById('pStock').value = p ? p.quantityInStock : 0;
      document.getElementById('pReorder').value = p ? p.reorderLevel : 10;
      document.getElementById('pmTitle').textContent = p ? 'Edit Product' : 'Add Product';
    }

    async function openAdd() {
      if (!warnSpanning()) return;
      renderForm(null, categories);
      const d = await EDY.api.get('/api/products/next-sku').catch(() => null);
      if (d && d.sku) document.getElementById('pSku').value = d.sku;
      EDY.ui.openModal('productModal');
    }

    // On a new product, keep the selling price in step with the purchase price
    // using the default profit percent. Editing an existing product is left alone.
    document.getElementById('pCost').addEventListener('input', function () {
      if (document.getElementById('pId').value) return;
      const suggested = suggestPrice(this.value);
      if (suggested !== '') document.getElementById('pPrice').value = suggested;
    });

    function stockBadge(p) {
      if (p.quantityInStock <= 0) return '<span class="badge bg-soft-red">Out of stock</span>';
      if (p.quantityInStock <= (p.reorderLevel || 0)) return '<span class="badge bg-soft-amber">Low</span>';
      return '<span class="badge bg-soft-green">In stock</span>';
    }

    /** The product photo, or the plain box icon when none has been uploaded. */
    function thumbHtml(r) {
      if (r.image && String(r.image).indexOf('data:image/') === 0) {
        return '<img src="' + esc(r.image) + '" alt="">';
      }
      return '<i class="bi bi-box-seam"></i>';
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
      if (!warnSpanning()) return;
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
      if (!warnSpanning()) return;
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
            '<div class="d-flex align-items-center gap-2"><div class="product-thumb">' + thumbHtml(r) + '</div>' +
            '<div><div class="fw-bold">' + esc(r.name) + '</div><div class="muted fs-12">' + esc(r.sku || '') + ' &middot; ' + (r.barcode || 'no barcode') + '</div></div></div>' },
          { key: 'category', label: 'Category', render: (r) => r.category ? '<span class="badge bg-soft-blue">' + esc(r.category.name) + '</span>' : '\u2014' },
          { key: 'costPrice', label: 'Purchase', money: true },
          { key: 'unitPrice', label: 'Selling', money: true },
          { key: 'vat', label: 'VAT', render: () => '<span class="badge bg-soft-purple">' + EDY.vat.pct() + '%</span>' },
          { key: 'quantityInStock', label: 'Stock', render: (r) => '<span class="fw-bold">' + EDY.fmt.qty(r.quantityInStock) + '</span>' },
          { key: 'reorderLevel', label: 'Min', render: (r) => EDY.fmt.qty(r.reorderLevel || 0) },
          { key: 'status', label: 'Status', render: (r) => stockBadge(r) },
          { key: 'id', label: 'Actions', render: (r) =>
            '<div class="d-flex align-items-center gap-1">' +
            '<button class="btn btn-ghost btn-icon" data-img="' + r.id + '" title="Upload or replace product image"><i class="bi bi-image"></i></button>' +
            '<div class="dropdown">' +
            '<button class="btn btn-primary btn-sm dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">Actions</button>' +
            '<ul class="dropdown-menu dropdown-menu-end">' +
            '<li><a class="dropdown-item" href="#" data-view="' + r.id + '"><i class="bi bi-eye me-2"></i>View</a></li>' +
            '<li><a class="dropdown-item" href="#" data-print="' + r.id + '"><i class="bi bi-printer me-2"></i>Print</a></li>' +
            '<li><a class="dropdown-item" href="#" data-edit="' + r.id + '"><i class="bi bi-pencil me-2"></i>Edit</a></li>' +
            '<li><a class="dropdown-item" href="#" data-stock="' + r.id + '"><i class="bi bi-box-arrow-in-down me-2"></i>Add Opening Stock</a></li>' +
            (r.image ? '<li><a class="dropdown-item" href="#" data-imgrm="' + r.id + '"><i class="bi bi-image-slash me-2"></i>Remove Image</a></li>' : '') +
            '<li><hr class="dropdown-divider"></li>' +
            '<li><a class="dropdown-item text-danger" href="#" data-del="' + r.id + '"><i class="bi bi-trash me-2"></i>Delete</a></li>' +
            '</ul></div></div>' }
        ],
        emptyText: 'No products yet. Click "Add Product" to create your first one.'
      });
    }

    document.getElementById('pTable').addEventListener('click', function (e) {
      const v = e.target.closest('[data-view]');
      const ed = e.target.closest('[data-edit]');
      const st = e.target.closest('[data-stock]');
      const dl = e.target.closest('[data-del]');
      const pr = e.target.closest('[data-print]');
      const up = e.target.closest('[data-img]');
      const rm = e.target.closest('[data-imgrm]');
      if (up) { e.preventDefault(); openUpload(Number(up.dataset.img)); }
      else if (rm) { e.preventDefault(); removeImage(Number(rm.dataset.imgrm)); }
      else if (v) { e.preventDefault(); openView(Number(v.dataset.view)); }
      else if (pr) { e.preventDefault(); printProduct(Number(pr.dataset.print)); }
      else if (ed) { e.preventDefault(); openEdit(Number(ed.dataset.edit)); }
      else if (st) { e.preventDefault(); openStock(Number(st.dataset.stock)); }
      else if (dl) { e.preventDefault(); remove(Number(dl.dataset.del)); }
    });

    // ---- product image upload ----
    let imgProductId = null;

    async function openUpload(id) {
      if (!(await ensureBusiness(id))) return;
      imgProductId = id;
      document.getElementById('imgInput').click();
    }

    /** Reads an image file, shrinks it for the database, then saves it. */
    async function saveImage(file) {
      if (!file) return;
      if (!/^image\//.test(file.type)) { EDY.ui.toast('Please choose an image file', 'warning'); return; }
      try {
        const dataUrl = await resizeImage(file, 400);
        const p = products.find(x => x.id === imgProductId);
        if (!p) return;
        const payload = {
          sku: p.sku, name: p.name, description: p.description || null,
          barcode: p.barcode || null, category: p.category ? { id: p.category.id } : null,
          costPrice: Number(p.costPrice), unitPrice: Number(p.unitPrice),
          quantityInStock: Number(p.quantityInStock), reorderLevel: Number(p.reorderLevel || 0),
          image: dataUrl
        };
        await EDY.api.put('/api/products/' + imgProductId, payload);
        EDY.ui.toast('Product image updated');
        products = await EDY.api.get('/api/products');
        renderCatList(); applyFilters();
      } catch (e) { EDY.ui.toast(e.message, 'error'); }
    }

    function resizeImage(file, max) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          let w = img.naturalWidth, h = img.naturalHeight;
          const scale = Math.max(w, h) > max ? max / Math.max(w, h) : 1;
          w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          try { resolve(cv.toDataURL('image/jpeg', 0.85)); }
          catch (err) { reject(err); }
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')); };
        img.src = url;
      });
    }

    async function removeImage(id) {
      if (!(await ensureBusiness(id))) return;
      const p = products.find(x => x.id === id);
      if (!p) return;
      const ok = await EDY.ui.confirm('Remove image?', 'Remove the photo from "' + p.name + '"?');
      if (!ok) return;
      try {
        const payload = {
          sku: p.sku, name: p.name, description: p.description || null,
          barcode: p.barcode || null, category: p.category ? { id: p.category.id } : null,
          costPrice: Number(p.costPrice), unitPrice: Number(p.unitPrice),
          quantityInStock: Number(p.quantityInStock), reorderLevel: Number(p.reorderLevel || 0),
          image: ''
        };
        await EDY.api.put('/api/products/' + id, payload);
        EDY.ui.toast('Product image removed');
        products = await EDY.api.get('/api/products');
        renderCatList(); applyFilters();
      } catch (e) { EDY.ui.toast(e.message, 'error'); }
    }

    document.getElementById('imgInput').addEventListener('change', (e) => {
      saveImage(e.target.files[0]);
      e.target.value = '';
    });

    /**
     * A product has no document of its own, so Print produces a stock/price sheet
     * — the same fields the View dialog shows, laid out to be pinned to a shelf or
     * handed to a buyer.
     */
    function printProduct(id) {
      const p = products.find(x => x.id === id);
      if (!p) return;
      const qty = Number(p.quantityInStock || 0);
      EDY.print.preview({
        title: p.name,
        subtitle: 'Product \u00b7 ' + (p.sku || 'no SKU'),
        html: EDY.print.record('Product', p.sku || '', [
          ['SKU', p.sku || '\u2014'],
          ['Barcode', p.barcode || '\u2014'],
          ['Name', p.name],
          ['Category', p.category ? p.category.name : '\u2014'],
          ['Description', p.description || '\u2014'],
          ['Purchase price', money(p.costPrice)],
          ['Selling price', money(p.unitPrice)],
          ['VAT rate', EDY.vat.pct() + '%'],
          ['Stock quantity', EDY.fmt.qty(qty)],
          ['Reorder level', EDY.fmt.qty(p.reorderLevel || 0)],
          ['Stock value at cost', money(qty * Number(p.costPrice || 0))],
          ['Status', qty <= 0 ? 'Out of stock' : (qty <= Number(p.reorderLevel || 0) ? 'Low stock' : 'In stock')]
        ])
      });
    }

    function openView(id) {
      const p = products.find(x => x.id === id);
      if (!p) return;
      const row = (label, val) => '<div class="d-flex justify-content-between border-bottom py-2 gap-3"><span class="muted">' + label + '</span><span class="fw-semibold text-end">' + val + '</span></div>';
      const imgHtml = (p.image && String(p.image).indexOf('data:image/') === 0)
        ? '<div class="text-center mb-3"><img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" style="max-height:150px;max-width:100%;border-radius:10px;object-fit:contain;border:1px solid var(--border)"></div>' : '';
      document.getElementById('pvBody').innerHTML =
        imgHtml +
        row('SKU', esc(p.sku || '\u2014')) +
        row('Barcode', esc(p.barcode || '\u2014')) +
        row('Name', esc(p.name)) +
        row('Category', p.category ? esc(p.category.name) : '\u2014') +
        row('Description', esc(p.description || '\u2014')) +
        row('Purchase Price', money(p.costPrice)) +
        row('Selling Price', money(p.unitPrice)) +
        row('VAT', EDY.vat.pct() + '%') +
        row('Stock Qty', EDY.fmt.qty(p.quantityInStock)) +
        row('Reorder Level', EDY.fmt.qty(p.reorderLevel || 0)) +
        row('Status', stockBadge(p));
      EDY.ui.openModal('productViewModal');
    }

    async function openStock(id) {
      if (!(await ensureBusiness(id))) return;
      currentStockId = id;
      const p = products.find(x => x.id === id);
      document.getElementById('osInfo').innerHTML =
        '<div class="fw-bold">' + esc(p.name) + '</div><div class="muted fs-13">' + esc(p.sku || '') +
        ' &middot; Current stock: <span class="fw-semibold">' + EDY.fmt.qty(p.quantityInStock) + '</span></div>';
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

    async function openEdit(id) {
      if (!(await ensureBusiness(id))) return;
      const p = products.find(x => x.id === id);
      renderForm(p, categories);
      EDY.ui.openModal('productModal');
    }

    async function remove(id) {
      if (!(await ensureBusiness(id))) return;
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
      if (id) { if (!(await ensureBusiness(Number(id)))) return; }
      else if (!warnSpanning()) return;
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
      if (!warnSpanning()) { e.target.value = ''; return; }
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