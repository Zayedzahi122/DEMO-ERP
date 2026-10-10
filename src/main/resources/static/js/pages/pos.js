/* EDY ERP — POS */
window.PAGE = {
  init: async function () {
    const box = document.getElementById('pageContent');
    const money = (v) => EDY.fmt.money(v);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    let products = [];
    let customers = [];
    let cart = [];
    let customerId = null;
    let discount = 0;
    let paymentMethod = 'CASH';

    box.innerHTML =
      '<div class="pos-hero">' +
        '<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">' +
          '<div class="page-title mb-0"><i class="bi bi-cart3 me-2"></i>New Sale</div>' +
          '<div class="pos-hero-sub flex-fill">Point of Sale &mdash; quick billing</div>' +
          '<div class="d-flex gap-2">' +
            '<button class="btn btn-ghost d-none" id="btnHold"><i class="bi bi-pause me-1"></i>Hold</button>' +
            '<button class="btn btn-ghost d-none" id="btnResume"><i class="bi bi-play-fill me-1"></i>Resume Held Sale</button>' +
            '<button class="btn btn-light" id="btnClear"><i class="bi bi-x-lg me-1"></i>Clear Cart</button>' +
          '</div>' +
        '</div>' +
        '<div class="pos-hero-stats" id="posHeroStats">' +
          '<div class="pos-hero-stat"><i class="bi bi-bag-check"></i><span id="hsItems">0 items</span></div>' +
          '<div class="pos-hero-stat"><i class="bi bi-people"></i><span>Walk-in Customer</span></div>' +
          '<div class="pos-hero-stat"><i class="bi bi-box-seam"></i><span class="pos-hero-live"><span class="pos-live-dot"></span>Products on stock</span></div>' +
        '</div>' +
      '</div>' +

      '<div id="regBar" class="mb-3"></div>' +

      '<div class="pos-grid">' +
        '<div class="card pos-products">' +
          '<div class="card-body">' +
            '<div class="row g-2 mb-3">' +
              '<div class="col-8">' +
                '<div class="input-group"><span class="input-group-text"><i class="bi bi-search"></i></span>' +
                '<input class="form-control" id="posSearch" placeholder="Search product or scan barcode / SKU, press Enter&hellip;" autocomplete="off">' +
                '<span class="input-group-text"><i class="bi bi-upc-scan"></i></span></div>' +
              '</div>' +
              '<div class="col-4"><select class="form-select" id="posCat"><option value="">All Categories</option></select></div>' +
            '</div>' +
            '<div class="pos-grid-tiles" id="posTiles"></div>' +
          '</div>' +
        '</div>' +

        '<div class="pos-cart">' +
          '<div class="pos-cart-head"><i class="bi bi-bag fs-5 text-primary"></i><div><div class="fw-bold">Current Sale</div><div class="muted fs-13" id="cartCount">0 items</div></div></div>' +
          '<div class="pos-cart-items" id="cartItems"></div>' +
          '<div class="pos-cart-totals">' +
            '<div class="row-line"><span>Subtotal</span><span class="fw-semibold text-dark" id="tSub">' + money(0) + '</span></div>' +
            '<div class="row-line"><span>Discount</span><span><input class="form-control form-control-sm text-end" style="width:110px;display:inline-block" type="number" min="0" step="0.001" id="tDiscount" value="0"></span></div>' +
            (EDY.vat.on() ? '<div class="row-line"><span>' + esc(EDY.vat.label()) + '</span><span class="fw-semibold text-dark" id="tTax">' + money(0) + '</span></div>' : '') +
            '<div class="row-line grand"><span>Grand Total</span><span class="text-primary" id="tGrand">' + money(0) + '</span></div>' +
            '<hr class="my-2">' +
            '<label class="form-label">Customer</label>' +
            '<div class="input-group input-group-sm mb-3">' +
              '<select class="form-select" id="posCustomer"><option value="">Walk-in Customer</option></select>' +
              '<button class="btn btn-outline-primary" id="btnAddCust" type="button" title="Add new customer"><i class="bi bi-person-plus-fill"></i></button>' +
            '</div>' +
            '<label class="form-label mb-2">Payment Method</label>' +
            '<div class="d-flex gap-2 mb-3" id="payMethods">' +
              '<button class="btn btn-outline-primary flex-fill pay-btn active" data-pay="CASH"><i class="bi bi-cash me-1"></i>Cash</button>' +
              '<button class="btn btn-outline-primary flex-fill pay-btn" data-pay="CARD"><i class="bi bi-credit-card me-1"></i>Card</button>' +
              '<button class="btn btn-outline-primary flex-fill pay-btn" data-pay="OTHER"><i class="bi bi-wallet me-1"></i>Other</button>' +
              '<button class="btn btn-outline-primary flex-fill pay-btn" data-pay="CREDIT"><i class="bi bi-clock-history me-1"></i>Credit</button>' +
            '</div>' +
            '<div class="d-flex align-items-center gap-2 mb-2">' +
              '<label class="form-label mb-0 flex-shrink-0">Amount paid</label>' +
              '<input class="form-control form-control-sm text-end" type="number" min="0" step="0.001" id="tAmountPaid" placeholder="0.000" title="Money received now. The grand total does not change, so the rest stays as balance due.">' +
              '<button class="btn btn-outline-secondary btn-sm" type="button" id="btnPayFull" title="Pay the full total">Full</button>' +
            '</div>' +
            '<div class="border rounded p-2 mb-2" id="splitBox">' +
              '<div class="d-flex justify-content-between align-items-center mb-1">' +
                '<span class="form-label mb-0">Split payment</span>' +
                '<button class="btn btn-outline-primary btn-sm" type="button" id="btnSplit"><i class="bi bi-plus-lg me-1"></i>Split</button>' +
              '</div>' +
              '<div id="splitRows"></div>' +
              '<div class="d-flex justify-content-between fs-13 mt-1">' +
                '<span class="muted">Paid</span><span class="fw-semibold" id="splitPaid">' + money(0) + '</span>' +
              '</div>' +
              '<div class="d-flex justify-content-between fs-13">' +
                '<span class="muted">Balance due</span><span class="fw-semibold" id="splitDue">' + money(0) + '</span>' +
              '</div>' +
            '</div>' +
            '<button class="btn btn-success btn-lg w-100" id="btnComplete" disabled>' +
              '<i class="bi bi-check-lg me-1"></i>Complete Sale &amp; Print</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    /* customer modal */
    const custModal = document.createElement('div');
    custModal.className = 'modal fade'; custModal.id = 'custModal';
    custModal.innerHTML =
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">' +
      '<div class="modal-header"><h5 class="modal-title"><i class="bi bi-person-plus me-2"></i>New Customer</h5>' +
      '<button class="btn-close" data-bs-dismiss="modal"></button></div>' +
      '<div class="modal-body">' +
      '<label class="form-label">Name *</label><input class="form-control mb-3" id="ncName" maxlength="100">' +
      '<label class="form-label">Phone</label><input class="form-control mb-3" id="ncPhone" maxlength="30">' +
      '<label class="form-label">Email</label><input class="form-control" id="ncEmail" type="email" maxlength="120">' +
      '</div>' +
      '<div class="modal-footer"><button class="btn btn-ghost" data-bs-dismiss="modal">Cancel</button>' +
      '<button class="btn btn-primary" id="ncSave"><i class="bi bi-check-lg me-1"></i>Add Customer</button></div></div></div>';
    document.body.appendChild(custModal);

    document.getElementById('btnAddCust').addEventListener('click', () => {
      document.getElementById('ncName').value = '';
      document.getElementById('ncPhone').value = '';
      document.getElementById('ncEmail').value = '';
      bootstrap.Modal.getOrCreateInstance(custModal).show();
      document.getElementById('ncName').focus();
    });
    document.getElementById('ncSave').addEventListener('click', async () => {
      const name = document.getElementById('ncName').value.trim();
      if (!name) { EDY.ui.toast('Customer name is required', 'warning'); return; }
      try {
        const c = await EDY.api.post('/api/customers', {
          name,
          phone: document.getElementById('ncPhone').value.trim() || undefined,
          email: document.getElementById('ncEmail').value.trim() || undefined
        });
        customers = customers.concat(c);
        const sel = document.getElementById('posCustomer');
        sel.insertAdjacentHTML('beforeend', '<option value="' + c.id + '">' + esc(c.name) + (c.phone ? ' &mdash; ' + esc(c.phone) : '') + '</option>');
        sel.value = c.id;
        customerId = c.id;
        bootstrap.Modal.getInstance(custModal).hide();
        EDY.ui.toast('Customer "' + c.name + '" added', 'success');
      } catch (err) { EDY.ui.toast(err.message, 'error'); }
    });

    /* receipt modal */
    const modal = document.createElement('div');
    modal.className = 'modal fade'; modal.id = 'receiptModal';
    modal.innerHTML =
      '<div class="modal-dialog modal-dialog-centered modal-lg"><div class="modal-content">' +
      '<div class="modal-header"><h5 class="modal-title"><i class="bi bi-receipt me-2"></i>Receipt Preview</h5>' +
      '<button class="btn-close" data-bs-dismiss="modal"></button></div>' +
      '<div class="modal-body" id="receiptBody"></div>' +
      '<div class="modal-footer"><button class="btn btn-ghost" data-bs-dismiss="modal">Close</button>' +
      '<button class="btn btn-primary" id="btnPrint"><i class="bi bi-printer me-1"></i>Print Receipt</button>' +
      '<button class="btn btn-success" id="btnNewSale"><i class="bi bi-plus me-1"></i>New Sale</button></div></div></div>';
    document.body.appendChild(modal);

    /* ---------- load data ---------- */
    [products, customers] = await Promise.all([
      EDY.api.get('/api/products').catch(() => []),
      EDY.api.get('/api/customers').catch(() => [])
    ]);
    products = (products || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    customers = customers || [];

    const cats = [...new Set(products.map(p => p.category && p.category.name).filter(Boolean))];
    const catSel = document.getElementById('posCat');
    cats.forEach(c => catSel.insertAdjacentHTML('beforeend', '<option>' + esc(c) + '</option>'));
    document.getElementById('posCustomer').insertAdjacentHTML('beforeend',
      customers.map(c => '<option value="' + c.id + '">' + esc(c.name) + (c.phone ? ' &mdash; ' + esc(c.phone) : '') + '</option>').join(''));

    document.getElementById('posCustomer').addEventListener('change', (e) => { customerId = e.target.value || null; });

    document.querySelectorAll('.pay-btn').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.pay-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      paymentMethod = b.dataset.pay;
      // a single typed payment follows the chosen method
      if (splitRows.length === 1) { splitRows[0].method = paymentMethod; renderSplit(); }
    }));

    /* ---------- rendering ---------- */
    let filterQ = '', filterCat = '';

    /** The uploaded product photo as a data URL, or '' when none exists. */
    function productImage(p) {
      return (p && p.image && String(p.image).indexOf('data:image/') === 0) ? esc(p.image) : '';
    }
    function stockCls(p) {
      return p.quantityInStock <= (p.reorderLevel || 0) ? 'bg-soft-amber' : 'bg-soft-green';
    }

    function renderTiles() {
      const q = filterQ.toLowerCase();
      const list = products.filter(p =>
        (!filterCat || (p.category && p.category.name === filterCat)) &&
        (!q || (p.name + ' ' + (p.sku || '') + ' ' + (p.barcode || '')).toLowerCase().includes(q)));
      const host = document.getElementById('posTiles');
      host.innerHTML = list.length ? list.map(p => {
        const img = productImage(p);
        return '<div class="card pos-tile p-2" data-id="' + p.id + '">' +
        (img
          ? '<div class="pt-photo"><img src="' + img + '" alt="' + esc(p.name) + '">' +
            '<span class="badge ' + stockCls(p) + ' pt-stock-badge">' + p.quantityInStock + '</span></div>'
          : '<div class="d-flex justify-content-between align-items-start"><div class="pt-icon"><i class="bi bi-box-seam text-primary"></i></div>' +
            '<span class="badge ' + stockCls(p) + '">' + p.quantityInStock + '</span></div>') +
        '<div class="pt-name mt-2">' + esc(p.name) + '</div>' +
        '<div class="muted fs-11">' + esc(p.sku || '') + '</div>' +
        '<div class="pt-price fs-15 mt-1">' + money(p.unitPrice) + '</div>' +
        '</div>';
      }).join('')
        : '<div class="empty-state" style="grid-column:1/-1"><i class="bi bi-search"></i><h6 class="mt-2">No products found</h6></div>';
      host.querySelectorAll('.pos-tile').forEach(t => t.addEventListener('click', () => addItem(Number(t.dataset.id))));
    }

    function addItem(id) {
      const p = products.find(x => x.id === id);
      if (!p) return;
      const existing = cart.find(c => c.product.id === id);
      const currentQty = existing ? existing.qty : 0;
      if (currentQty >= p.quantityInStock) {
        EDY.ui.toast('Only ' + p.quantityInStock + ' in stock for ' + p.name, 'warning');
        return;
      }
      if (existing) existing.qty++;
      else cart.push({ product: p, qty: 1 });
      renderCart();
    }
    function changeQty(id, delta) {
      const entry = cart.find(c => c.product.id === id);
      if (!entry) return;
      const p = entry.product;
      const next = entry.qty + delta;
      if (next > p.quantityInStock) { EDY.ui.toast('Not enough stock for ' + p.name, 'warning'); return; }
      if (next <= 0) cart = cart.filter(c => c.product.id !== id);
      else entry.qty = next;
      renderCart();
    }

    // The grand total is always the computed one; the amount box records money
    // received and can never change it, so the rest stays as balance due.
    function cartTotals() {
      const subtotal = cart.reduce((s, c) => s + Number(c.product.unitPrice || 0) * c.qty, 0);
      const disc = Math.min(Number(document.getElementById('tDiscount').value || 0), subtotal);
      const taxable = subtotal - disc;
      const s = EDY.vat.split(taxable);
      return { subtotal, discount: disc, tax: s.tax, computed: s.total, grand: s.total };
    }

    /* ---------- split payment ---------- */
    let splitRows = [];

    function splitPaidSum() {
      return splitRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    }

    function paintSplitTotals() {
      const t = cartTotals();
      const paid = splitPaidSum();
      const due = Math.max(0, t.grand - paid);
      // mirror the split rows into the amount box, but never fight the user mid-typing
      const ap = document.getElementById('tAmountPaid');
      if (ap && document.activeElement !== ap) ap.value = paid > 0 ? Math.round(paid * 1000) / 1000 : '';
      document.getElementById('splitPaid').textContent = money(paid);
      const dueEl = document.getElementById('splitDue');
      dueEl.textContent = money(due);
      dueEl.className = 'fw-semibold ' + (due > 0.0001 ? 'text-red' : 'text-green');
      return { paid, due };
    }

    function renderSplit() {
      const host = document.getElementById('splitRows');
      if (!splitRows.length) {
        host.innerHTML = '<div class="muted fs-13">Single payment — use the method buttons above, or type an amount below.</div>';
      } else {
        host.innerHTML = splitRows.map((r, i) =>
          '<div class="d-flex gap-1 mb-1">' +
            '<select class="form-select form-select-sm sp-method" style="max-width:96px">' +
              ['CASH', 'CARD', 'OTHER', 'CREDIT'].map(m => '<option value="' + m + '"' + (r.method === m ? ' selected' : '') + '>' + m.charAt(0) + m.slice(1).toLowerCase() + '</option>').join('') +
            '</select>' +
            '<input class="form-control form-control-sm text-end sp-amt" type="number" min="0" step="0.001" value="' + r.amount + '">' +
            '<button class="btn btn-ghost btn-icon sp-del" type="button" data-i="' + i + '"><i class="bi bi-x-lg text-danger"></i></button>' +
          '</div>').join('');
      }
      paintSplitTotals();

      host.querySelectorAll('.sp-amt').forEach((inp, i) => inp.addEventListener('input', () => {
        splitRows[i].amount = Number(inp.value || 0);
        paintSplitTotals();
      }));
      host.querySelectorAll('.sp-method').forEach((sel, i) => sel.addEventListener('change', () => { splitRows[i].method = sel.value; }));
      host.querySelectorAll('.sp-del').forEach(b => b.addEventListener('click', () => {
        splitRows.splice(Number(b.dataset.i), 1);
        renderSplit();
      }));
    }

    function renderSplitTotalsOnly() {
      paintSplitTotals();
    }

    function renderCart() {
      const host = document.getElementById('cartItems');
      document.getElementById('cartCount').textContent = cart.reduce((s, c) => s + c.qty, 0) + ' item' + (cart.reduce((s, c) => s + c.qty, 0) === 1 ? '' : 's');
      host.innerHTML = cart.length ? cart.map(c => {
        const img = productImage(c.product);
        return '<div class="cart-item">' +
        '<div class="product-thumb" style="width:36px;height:36px;font-size:16px">' + (img ? '<img src="' + img + '" alt="">' : '<i class="bi bi-box2"></i>') + '</div>' +
        '<div class="flex-grow-1"><div class="fs-13 fw-bold">' + esc(c.product.name) + '</div>' +
        '<div class="muted fs-12">' + money(c.product.unitPrice) + '</div></div>' +
        '<div class="qty-control">' +
        '<button data-id="' + c.product.id + '" data-d="-1">-</button>' +
        '<span class="qty">' + c.qty + '</span>' +
        '<button data-id="' + c.product.id + '" data-d="1">+</button></div>' +
        '<div class="ci-price" style="min-width:78px;text-align:right">' + money(Number(c.product.unitPrice) * c.qty) + '</div>' +
        '<button class="btn btn-ghost btn-icon" data-rm="' + c.product.id + '"><i class="bi bi-trash text-danger"></i></button>' +
        '</div>';
      }).join('')
        : '<div class="empty-state py-5"><i class="bi bi-bag"></i><h6 class="mt-2">Cart is empty</h6><div class="fs-13">Click a product to add it</div></div>';

      host.querySelectorAll('.qty-control button').forEach(b => b.addEventListener('click', () => changeQty(Number(b.dataset.id), Number(b.dataset.d))));
      host.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { cart = cart.filter(c => c.product.id !== Number(b.dataset.rm)); renderCart(); }));

      const t = cartTotals();
      document.getElementById('tSub').textContent = money(t.subtotal);
      const taxEl = document.getElementById('tTax');
      if (taxEl) taxEl.textContent = money(t.tax);
      document.getElementById('tGrand').textContent = money(t.grand);
      document.getElementById('tGrand').className = 'text-primary';
      if (typeof renderSplit === 'function') renderSplitTotalsOnly();
      document.getElementById('btnComplete').disabled = !cart.length;
    }
    document.getElementById('tDiscount').addEventListener('input', () => {
      discount = Number(document.getElementById('tDiscount').value || 0);
      renderCart();
    });
    document.getElementById('posSearch').addEventListener('input', (e) => { filterQ = e.target.value; renderTiles(); });
    document.getElementById('posSearch').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = e.target.value.trim().toLowerCase();
        const hit = products.find(p => (p.sku || '').toLowerCase() === q) || products.find(p => (p.name || '').toLowerCase() === q) || products.find(p => (p.sku || '').toLowerCase().includes(q)) || products.find(p => (p.name || '').toLowerCase().includes(q));
        if (hit) { addItem(hit.id); e.target.select(); }
        else EDY.ui.toast('No product matched "' + e.target.value + '"', 'warning');
      }
    });
    document.getElementById('posCat').addEventListener('change', (e) => { filterCat = e.target.value || ''; renderTiles(); });

    /* ---------- actions ---------- */
    document.getElementById('btnClear').addEventListener('click', async () => {
      if (!cart.length && !discount) return;
      const ok = await EDY.ui.confirm('Clear cart?', 'All items in the current sale will be removed.');
      if (!ok) return;
      cart = []; discount = 0; document.getElementById('tDiscount').value = 0;
      renderCart();
    });

    // Typing records money received against the selected payment method. It never
    // changes the grand total, so the unentered part becomes the balance due.
    document.getElementById('tAmountPaid').addEventListener('input', (e) => {
      const v = Math.max(0, Number(e.target.value || 0));
      splitRows = v > 0 ? [{ method: paymentMethod, amount: Math.round(v * 1000) / 1000 }] : [];
      renderSplit();
    });
    document.getElementById('btnPayFull').addEventListener('click', () => {
      const g = Math.round(cartTotals().grand * 1000) / 1000;
      splitRows = [{ method: paymentMethod, amount: g }];
      renderSplit();
    });
    document.getElementById('btnSplit').addEventListener('click', () => {
      const t = cartTotals();
      const paid = splitRows.reduce((s, r) => s + Number(r.amount || 0), 0);
      const remaining = Math.max(0, Math.round((t.grand - paid) * 1000) / 1000);
      if (splitRows.length === 0) {
        splitRows.push({ method: paymentMethod, amount: remaining });
      } else {
        splitRows.push({ method: 'CARD', amount: remaining });
      }
      renderSplit();
    });

    document.getElementById('btnResume').addEventListener('click', () => {
      try {
        const held = JSON.parse(localStorage.getItem('edy.heldSale') || 'null');
        if (held && held.items) {
          cart = held.items.map(i => ({ product: products.find(p => p.id === i.product.id), qty: i.qty })).filter(i => i.product);
          discount = held.discount || 0;
          document.getElementById('tDiscount').value = discount;
          customerId = held.customerId || null;
          document.getElementById('posCustomer').value = customerId || '';
          if (held.paymentMethod) { paymentMethod = held.paymentMethod; document.querySelectorAll('.pay-btn').forEach(x => x.classList.toggle('active', x.dataset.pay === paymentMethod)); }
          localStorage.removeItem('edy.heldSale');
          document.getElementById('btnResume').classList.add('d-none');
          EDY.ui.toast('Held sale restored', 'info');
          renderCart();
        }
      } catch (e) { /* ignore */ }
    });
    const btnHold = document.getElementById('btnHold');
    function enableHold() { btnHold.classList.toggle('d-none', !cart.length); }
    btnHold.addEventListener('click', () => {
      localStorage.setItem('edy.heldSale', JSON.stringify({ items: cart.map(c => ({ product: { id: c.product.id }, qty: c.qty })), discount, customerId, paymentMethod }));
      cart = []; discount = 0; document.getElementById('tDiscount').value = 0;
      renderCart(); enableHold();
      document.getElementById('btnResume').classList.remove('d-none');
      EDY.ui.toast('Sale held. Resume it any time.', 'info');
    });

    /* ---------- cash register gate ---------- */
    function refreshRegUI() {
      const regBar = document.getElementById('regBar');
      if (!EDY.register.isOpen()) {
        EDY.register.mountGate(box);
      } else {
        EDY.register.mountChip(regBar);
        box.querySelectorAll('.pos-register-gate').forEach(n => n.remove());
      }
    }
    refreshRegUI();

    /* ---------- checkout ---------- */
    document.getElementById('btnComplete').addEventListener('click', async () => {
      if (!cart.length) return;
      if (!EDY.register.isOpen()) {
        EDY.ui.toast('Open a cash register before completing the sale', 'warning');
        refreshRegUI();
        return;
      }
      const t = cartTotals();
      if (t.discount > t.subtotal) { EDY.ui.toast('Discount cannot exceed subtotal', 'error'); return; }

      // Build payment rows: either the split rows, or one full payment for the chosen method.
      const splitPaid = splitRows.reduce((s, r) => s + Number(r.amount || 0), 0);
      const useSplit = splitRows.length > 0;
      const payments = useSplit
        ? splitRows.filter(r => Number(r.amount) > 0).map(r => ({ method: r.method, amount: Number(r.amount) }))
        : [{ method: paymentMethod, amount: Math.round(t.grand * 1000) / 1000 }];

      if (useSplit) {
        const over = splitPaid - t.grand;
        if (over > 0.001) { EDY.ui.toast('Split payment is more than the total', 'error'); return; }
      }

      const payload = {
        customerId: customerId || undefined,
        items: cart.map(c => ({ productId: c.product.id, quantity: c.qty, unitPrice: c.product.unitPrice })),
        discount: t.discount ? t.discount : undefined,
        paymentMethod,
        // Where this sale is happening: the location picked in the top bar.
        location: (window.EDY.layout ? EDY.layout.branch() : (localStorage.getItem('edy.branch') || 'Main Branch')),
        payments
        // the total is always the computed one; status is derived server-side
        // from amountPaid vs total, so a part payment is stored as a Due sale
      };
      try {
        const saved = await EDY.api.post('/api/sales-invoices', payload);
        const cashIn = payments.filter(p => p.method === 'CASH').reduce((s, p) => s + Number(p.amount || 0), 0);
        if (cashIn > 0) EDY.register.addCashSale(cashIn);
        renderReceipt(saved, cart);
        const m = bootstrap.Modal.getOrCreateInstance(modal);
        m.show();
        cart = []; discount = 0; document.getElementById('tDiscount').value = 0;
        document.getElementById('tAmountPaid').value = '';
        splitRows = [];
        renderCart(); renderSplit(); enableHold();
        products = await EDY.api.get('/api/products').catch(() => products);
        renderTiles();
        EDY.ui.toast('Sale ' + saved.invoiceNumber + ' completed');
      } catch (err) {
        EDY.ui.toast(err.message, 'error');
      }
    });

    function renderReceipt(inv, lines) {
      const payMap = { CASH: 'Cash', CARD: 'Card', OTHER: 'Other', CREDIT: 'Credit' };
      // A sale paid by more than one method is labelled "Multipay".
      function payLabel(inv) {
        const pays = (inv.payments || []).map(p => p.method).filter(Boolean);
        const distinct = [...new Set(pays)];
        if (distinct.length > 1) return 'Multipay';
        if (pays.length === 1) return payMap[distinct[0]] || distinct[0];
        return payMap[inv.paymentMethod] || inv.paymentMethod || 'Cash';
      }
      const body = document.getElementById('receiptBody');
      const ci = lines.reduce((s, c) => s + c.qty, 0);
      body.innerHTML =
        '<div class="invoice-print" id="printArea">' +
        '<div class="text-center mb-3"><div class="fw-bold fs-5">' + esc(EDY.settings['biz.name'] || 'EDY ERP') + '</div><div class="muted fs-13">' +
        esc([EDY.settings['biz.address'] || '', EDY.settings['biz.vatNo'] ? 'VAT: ' + EDY.settings['biz.vatNo'] : ''].filter(Boolean).join(' \u00b7 ') || ' ') +
        '</div>' +
        '<div class="muted fs-13">' + EDY.fmt.datetime(new Date()) + '</div></div>' +
        '<hr>' +
        '<div class="d-flex justify-content-between fs-13 mb-2"><span class="muted">Invoice No</span><span class="fw-bold">' + esc(inv.invoiceNumber) + '</span></div>' +
        '<div class="d-flex justify-content-between fs-13 mb-2"><span class="muted">Customer</span><span class="fw-bold">' + esc(inv.customer ? inv.customer.name : '\u2014') + '</span></div>' +
        '<div class="d-flex justify-content-between fs-13 mb-2"><span class="muted">Payment</span><span class="fw-bold">' + payLabel(inv) + '</span></div>' +
        '<hr>' +
        '<table class="table table-sm fs-13"><thead><tr><th>Item</th><th class="text-center">Qty</th><th class="text-end">Price</th><th class="text-end">Total</th></tr></thead><tbody>' +
        lines.map(c => '<tr><td>' + esc(c.product.name) + '</td><td class="text-center">' + c.qty + '</td><td class="text-end">' + money(c.product.unitPrice) + '</td><td class="text-end">' + money(Number(c.product.unitPrice) * c.qty) + '</td></tr>').join('') +
        '</tbody></table>' +
        '<hr>' +
        '<div class="d-flex justify-content-between fs-13"><span class="muted">Items</span><span>' + ci + '</span></div>' +
        '<div class="d-flex justify-content-between fs-13"><span class="muted">Subtotal</span><span>' + money(inv.subtotal) + '</span></div>' +
        '<div class="d-flex justify-content-between fs-13"><span class="muted">Discount</span><span>' + money(inv.discount || 0) + '</span></div>' +
        /* A saved invoice shows its own stored tax, never today's rate - the rate may
           have changed since it was written. A zero tax line is hidden. */
        (Number(inv.taxAmount) > 0
          ? '<div class="d-flex justify-content-between fs-13"><span class="muted">VAT</span><span>' + money(inv.taxAmount) + '</span></div>'
          : '') +
        '<div class="d-flex justify-content-between fs-5 fw-bold mt-1 border-top pt-2"><span>Total</span><span>' + money(inv.totalAmount) + '</span></div>' +
        ((inv.payments && inv.payments.length)
          ? (inv.payments || []).map(p => '<div class="d-flex justify-content-between fs-13"><span class="muted">Paid (' + esc(payMap[p.method] || p.method) + ')</span><span>' + money(p.amount) + '</span></div>').join('') +
            '<div class="d-flex justify-content-between fs-13 fw-bold ' + (Number(inv.balanceDue) > 0.001 ? 'text-red' : 'text-green') + '">' +
              '<span>Balance due</span><span>' + money(inv.balanceDue) + '</span></div>'
          : '<div class="d-flex justify-content-between fs-13 fw-bold text-red"><span>Balance due</span><span>' + money(inv.balanceDue) + '</span></div>') +
        '<hr>' +
        '<div class="text-center muted fs-13 mb-2">Thank you for your purchase!</div>' +
        '</div>';
    }

    /**
     * The receipt is already on screen behind the dialog, so the preview shows that
     * exact markup rather than a second, independently built document that could
     * disagree with it. Printing straight into a new window left the cashier with
     * no sight of what the customer was about to be handed.
     */
    document.getElementById('btnPrint').addEventListener('click', () => {
      const area = document.getElementById('printArea');
      if (!area) return;
      EDY.print.preview({
        title: 'Receipt',
        subtitle: EDY.settings['biz.name'] || 'Sales receipt',
        html: '<div class="app-print">' + area.outerHTML + '</div>'
      });
    });
    document.getElementById('btnNewSale').addEventListener('click', () => bootstrap.Modal.getInstance(modal).hide());

    renderTiles();
    renderCart();
    if (localStorage.getItem('edy.heldSale')) document.getElementById('btnResume').classList.remove('d-none');
  }
};