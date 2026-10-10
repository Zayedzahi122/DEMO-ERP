/* EDY ERP — Layout shell: sidebar, topbar, auth guard */
window.EDY = window.EDY || {};

EDY.modules = [
  { key: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
  { key: 'pos', label: 'POS / New Sale', icon: 'bi-bag-check-fill' },
  { key: 'sales', label: 'Sales', icon: 'bi-receipt' },
  { key: 'purchases', label: 'Purchases', icon: 'bi-cart-plus' },
  { key: 'products', label: 'Products', icon: 'bi-box-seam-fill' },
  { key: 'inventory', label: 'Inventory / Stock', icon: 'bi-boxes' },
  { key: 'customers', label: 'Customers', icon: 'bi-people-fill' },
  { key: 'suppliers', label: 'Suppliers', icon: 'bi-truck' },
  { key: 'expenses', label: 'Expenses', icon: 'bi-wallet2' },
  { key: 'payments', label: 'Payment Accounts', icon: 'bi-cash-stack' },
  { key: 'reports', label: 'Reports', icon: 'bi-graph-up-arrow' },
  { key: 'users', label: 'Users & Roles', icon: 'bi-person-gear' },
  { key: 'settings', label: 'Settings', icon: 'bi-sliders' }
];

EDY.layout = (() => {

  // Sits above everything else because it is not a module - it is the platform
  // owner's surface, above the businesses themselves. Only rendered for super
  // admins; see EDY.tenant.isSuperAdmin() in init().
  const SUPER_ADMIN_ITEM = {
    key: 'super-admin', href: '/super-admin', icon: 'bi-buildings-fill', label: 'Super Admin',
    superAdminOnly: true
  };

  const NAV = [
    SUPER_ADMIN_ITEM,
    { key: 'dashboard', href: '/', icon: 'bi-grid-1x2-fill', label: 'Dashboard' },
    { key: 'pos', href: '/pos', icon: 'bi-bag-check-fill', label: 'POS / New Sale' },
    { key: 'sales', icon: 'bi-receipt', label: 'Sales', children: [
      { key: 'sales-list', href: '/sales', icon: 'bi-list-ul', label: 'All Sales' },
      { key: 'sales-cancel', href: '/sales', icon: 'bi-slash-circle', label: 'Edit / Cancel Sale' },
      { key: 'sales-quote-list', href: '/quotations', icon: 'bi-file-earmark-text', label: 'List Quotations' },
      { key: 'sales-quote-add', href: '/quotations?new=1', icon: 'bi-file-earmark-plus', label: 'Add Quotation' },
      { key: 'sales-import', href: '/sales', icon: 'bi-upload', label: 'Import Sales' },
      { key: 'sales-deleted', href: '/sales?status=CANCELLED', icon: 'bi-trash', label: 'Deleted Sales' }
    ]},
    { key: 'purchases', icon: 'bi-cart-plus', label: 'Purchases', children: [
      { key: 'po-list', href: '/purchases', icon: 'bi-list-ul', label: 'List Purchase Orders' },
      { key: 'po-add', href: '/purchases?new=1', icon: 'bi-plus-lg', label: 'New Purchase Order' },
      { key: 'po-import', href: '/purchases', icon: 'bi-upload', label: 'Import Purchases' }
    ]},
    { key: 'products', icon: 'bi-box-seam-fill', label: 'Products', children: [
      { key: 'products-list', href: '/products', icon: 'bi-list-ul', label: 'All Products' },
      { key: 'products-add', href: '/products?new=1', icon: 'bi-plus-lg', label: 'Add Product' },
      { key: 'products-cats', href: '/products', icon: 'bi-folder2-open', label: 'Categories' },
      { key: 'products-import', href: '/products', icon: 'bi-arrow-left-right', label: 'Import / Export' }
    ]},
    { key: 'inventory', icon: 'bi-boxes', label: 'Inventory / Stock', children: [
      { key: 'inv-move', href: '/inventory', icon: 'bi-arrow-left-right', label: 'Stock Movements' },
      { key: 'inv-low', href: '/inventory', icon: 'bi-exclamation-triangle', label: 'Low / Out of Stock' },
      { key: 'inv-adjust', href: '/inventory?adjust=1', icon: 'bi-pencil-square', label: 'Adjust Stock' }
    ]},
    { key: 'customers', icon: 'bi-people-fill', label: 'Customers', children: [
      { key: 'cust-list', href: '/customers', icon: 'bi-list-ul', label: 'All Customers' },
      { key: 'cust-add', href: '/customers?new=1', icon: 'bi-person-plus', label: 'Add Customer' },
      { key: 'cust-import', href: '/customers', icon: 'bi-upload', label: 'Import Customers' }
    ]},
    { key: 'suppliers', icon: 'bi-truck', label: 'Suppliers', children: [
      { key: 'sup-list', href: '/suppliers', icon: 'bi-list-ul', label: 'All Suppliers' },
      { key: 'sup-add', href: '/suppliers?new=1', icon: 'bi-building-add', label: 'Add Supplier' }
    ]},
    { key: 'expenses', icon: 'bi-wallet2', label: 'Expenses', children: [
      { key: 'exp-list', href: '/expenses', icon: 'bi-list-ul', label: 'All Expenses' },
      { key: 'exp-add', href: '/expenses?new=1', icon: 'bi-plus-lg', label: 'Add Expense' }
    ]},
    { key: 'payments', icon: 'bi-cash-stack', label: 'Payment Accounts', children: [
      { key: 'pay-accounts', href: '/payments', icon: 'bi-collection', label: 'List Accounts' },
      { key: 'pay-transfer', href: '/payments?view=transfer', icon: 'bi-arrow-left-right', label: 'Fund Transfer' },
      { key: 'pay-balance', href: '/payments?view=assets', icon: 'bi-balance-scale', label: 'Balance Sheet' },
      { key: 'pay-trial', href: '/payments?view=trial', icon: 'bi-list-check', label: 'Trial Balance' },
      { key: 'pay-cashflow', href: '/payments?view=cashflow', icon: 'bi-cash-stack', label: 'Cash Flow' },
      { key: 'pay-report', href: '/payments?view=statement', icon: 'bi-receipt-cutoff', label: 'Payment Account Report' }
    ]},
    { key: 'reports', href: '/reports', icon: 'bi-graph-up-arrow', label: 'Reports' },
    { key: 'users', href: '/users', icon: 'bi-person-gear', label: 'Users & Roles' },
    { key: 'settings', href: '/settings', icon: 'bi-sliders', label: 'Settings' }
  ];

  // A business's locations come from its registry record (set by the Super Admin
  // when creating the business) and reach this screen through the settings
  // snapshot. The picker always has something to show, so it falls back to a
  // single default rather than rendering an empty menu.
  const DEFAULT_LOCATION = 'Main Branch';
  let me = null;
  let navItems = NAV;
  /** Super admin state from /api/businesses/context. Null until loaded. */
  let tenantCtx = null;

  function visibleNav() {
    // The Super Admin entry belongs to the admin console only: once a super admin
    // has stepped into a business (actingBusiness set) the sidebar is that
    // business's own list, and business accounts never get it at all — they reach
    // the console through the top-bar button instead.
    if (!tenantCtx || !tenantCtx.superAdmin || tenantCtx.actingBusiness) {
      return navItems.filter(n => !n.superAdminOnly);
    }
    return navItems;
  }

  function shell(user) {
    const main = document.getElementById('pageContent');
    if (!main) return false;
    const shellDiv = document.createElement('div');
    shellDiv.className = 'app-shell';
    main.parentNode.insertBefore(shellDiv, main);

    const navHtml = visibleNav().map(n => {
      if (n.children && n.children.length) {
        return '<div class="nav-group" data-group="' + n.key + '">' +
          '<button class="nav-item" type="button" data-nav="' + n.key + '">' +
          '<i class="bi ' + n.icon + '"></i><span>' + n.label + '</span>' +
          '<i class="bi bi-chevron-down chevron"></i></button>' +
          '<div class="sub-nav">' +
          n.children.map(c =>
            c.soon
              ? '<button class="nav-item soon" type="button" data-nav="' + c.key + '"><i class="bi ' + (c.icon || 'bi-dot') + '"></i><span>' + c.label + '</span><span class="soon-tag">Soon</span></button>'
              : '<a class="nav-item" href="' + c.href + '" data-nav="' + c.key + '"><i class="bi ' + (c.icon || 'bi-dot') + '"></i><span>' + c.label + '</span></a>'
          ).join('') +
          '</div></div>';
      }
      return '<button class="nav-item" type="button" data-nav="' + n.key + '" data-href="' + n.href + '">' +
        '<i class="bi ' + n.icon + '"></i><span>' + n.label + '</span></button>';
    }).join('');

    // A logo uploaded in Settings replaces the placeholder initial. It must sit in
    // the same fixed 38px box the placeholder used; without one the browser stretches
    // the image to the sidebar's full width and shoves the business name off screen.
    const bizLogo = EDY.settings['biz.logo'];
    const logoMark = /^data:image\//.test(bizLogo || '')
      ? '<img class="logo" src="' + escapeHtml(bizLogo) + '" alt="' + escapeHtml(EDY.settings['biz.name'] || 'logo') + '">'
      : '<div class="logo">E</div>';

    shellDiv.innerHTML =
      '<aside class="sidebar" id="edySidebar">' +
        '<div class="sidebar-brand">' +
          logoMark +
          '<div><div class="brand-name">' + escapeHtml(EDY.settings['biz.name'] || 'DEMO ERP') + '</div><div class="brand-sub">Business Suite</div></div>' +
        '</div>' +
        '<nav class="sidebar-nav">' +
          '<div class="sidebar-section">Main Menu</div>' + navHtml +
        '</nav>' +
        '<div class="sidebar-footer">' +
          '<div class="user-chip">' +
            EDY.avatar(user.name) +
            '<div><div class="uc-name">' + escapeHtml(user.name) + '</div><div class="uc-role">' + escapeHtml(user.role || 'User') + '</div></div>' +
          '</div>' +
        '</div>' +
      '</aside>' +
      '<div class="sidebar-backdrop" id="edyBackdrop" hidden></div>' +
      '<div class="main">' +
        '<header class="topbar" id="edyTopbar"></header>' +
        '<main class="main-body"></main>' +
      '</div>';

    const bodyMain = shellDiv.querySelector('.main-body');
    bodyMain.appendChild(main);
    topbar(user, bodyMain);

    /* sidebar interactions */
    document.querySelectorAll('.nav-item').forEach(nItem => {
      if (nItem.dataset.href) nItem.addEventListener('click', () => { location.href = nItem.dataset.href; });
    });
    document.querySelectorAll('.nav-group > .nav-item').forEach(header => {
      header.addEventListener('click', () => { header.closest('.nav-group').classList.toggle('open'); });
    });
    document.querySelectorAll('.sub-nav .nav-item.soon').forEach(soon => {
      soon.addEventListener('click', () => EDY.ui.toast('This feature is coming soon', 'info'));
    });
    const backdrop = document.getElementById('edyBackdrop');
    document.getElementById('edyMenuBtn').addEventListener('click', () => {
      document.getElementById('edySidebar').classList.toggle('open');
      backdrop.hidden = !backdrop.hidden;
    });
    backdrop.addEventListener('click', () => {
      document.getElementById('edySidebar').classList.remove('open');
      backdrop.hidden = true;
    });
    return true;
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /** The top-bar language toggle shows the language that is currently on. */
  function syncLangLabel() {
    const el = document.getElementById('edyLangLabel');
    if (!el) return;
    const ar = !!(EDY.i18n && EDY.i18n.isArabic());
    el.textContent = ar ? '\u0639\u0631\u0628\u064a' : 'EN';
    const btn = document.getElementById('edyLangBtn');
    if (btn) btn.title = ar ? 'Language / \u0627\u0644\u0644\u063a\u0629' : 'Language / \u0627\u0644\u0644\u063a\u0629';
  }

  /** The locations to offer in the top bar, defaulting to a single generic one. */
  function locationsList() {
    const locs = EDY.settings && Array.isArray(EDY.settings.locations)
      ? EDY.settings.locations.map(s => String(s || '').trim()).filter(Boolean)
      : [];
    return locs.length ? locs : [DEFAULT_LOCATION];
  }

  /** The location the user picked, as long as it is still one the business has. */
  function pickBranch() {
    const saved = localStorage.getItem('edy.branch');
    const locs = locationsList();
    return (saved && locs.indexOf(saved) >= 0) ? saved : locs[0];
  }

  function topbar(user, bodyMain) {
    const locs = locationsList();
    const branch = pickBranch();
    const tb = document.getElementById('edyTopbar');
    tb.innerHTML =
      '<button class="icon-btn d-lg-none" id="edyMenuBtn" type="button"><i class="bi bi-list"></i></button>' +
      // POS is the screen people are on when they are actually selling, so it is one
      // click from anywhere. Always shown: every business has a till, and the sidebar
      // buries POS under a scroll on a short window.
      '<a class="tb-quick tb-pos" href="/pos" title="Point of Sale">' +
        '<i class="bi bi-bag-check-fill"></i><span>POS</span></a>' +
      // Printing is asked for from every screen, so the entry point lives in the top
      // bar instead of being re-invented (and left off) by each page.
      '<button class="tb-quick tb-print" type="button" id="edyPrintBtn" ' +
        'title="Preview and print this page">' +
        '<i class="bi bi-printer-fill"></i><span>Print</span></button>' +
      // The way back out. Only meaningful while looking into one business, and it has
      // to be at the top and always visible: without it a super admin who switched in
      // can get stuck browsing a company with no sign they left the admin console.
      (tenantCtx && tenantCtx.superAdmin && tenantCtx.actingBusiness
        ? '<a class="tb-quick tb-back" href="/super-admin" id="edyBackToAdmin" ' +
          'title="Leave ' + escapeHtml(tenantCtx.actingBusiness.name) + ' and manage businesses">' +
          '<i class="bi bi-arrow-left"></i><span>Super Admin</span></a>'
        : '') +
      // Business accounts have no Super Admin entry in their sidebar, but the owner
      // still needs a way up to the console: this button leads there (the page
      // itself asks for the administrator sign-in when the account is not one).
      (tenantCtx && !tenantCtx.superAdmin
        ? '<a class="tb-quick tb-back" href="/super-admin" title="Open the Super Admin console">' +
          '<i class="bi bi-buildings-fill"></i><span>Super Admin</span></a>'
        : '') +
      '<div class="topbar-search">' +
        '<i class="bi bi-search"></i>' +
        '<input type="text" id="edySearch" placeholder="Search pages, products, invoices\u2026" autocomplete="off">' +
        '<kbd>/</kbd>' +
        '<div class="dropdown-menu" id="edySearchMenu" style="width:100%"></div>' +
      '</div>' +
      '<div class="tb-divider d-none d-md-block"></div>' +
      '<div class="dropdown">' +
        '<button class="tb-quick tb-lang" id="edyLangBtn" data-bs-toggle="dropdown" aria-label="Language" title="Language / اللغة"><span id="edyLangLabel">EN</span></button>' +
        '<ul class="dropdown-menu shadow-sm dropdown-menu-end">' +
          '<li><button class="dropdown-item edy-lang" data-l="en" type="button">English</button></li>' +
          '<li><button class="dropdown-item edy-lang" data-l="ar" type="button">العربية</button></li>' +
        '</ul>' +
      '</div>' +
      '<div class="dropdown">' +
        '<button class="branch-pill" data-bs-toggle="dropdown"><i class="bi bi-geo-alt-fill"></i>' +
        '<span id="edyBranchLabel">' + escapeHtml(branch) + '</span><i class="bi bi-chevron-down" style="font-size:11px"></i></button>' +
        '<ul class="dropdown-menu shadow-sm">' +
          locs.map(b => '<li><a class="dropdown-item edy-branch" data-b="' + escapeHtml(b) + '" href="#">' + escapeHtml(b) + '</a></li>').join('') +
        '</ul>' +
      '</div>' +
      '<div class="dropdown">' +
        '<button class="icon-btn" data-bs-toggle="dropdown" aria-label="Notifications">' +
          '<i class="bi bi-bell"></i><span class="dot" id="edyNotifDot"></span>' +
        '</button>' +
        '<div class="dropdown-menu dropdown-menu-end shadow" style="width:340px" id="edyNotifMenu"></div>' +
      '</div>' +
      '<div class="dropdown avatar-menu">' +
        '<div class="avatar" data-bs-toggle="dropdown">' + EDY.fmt.initials(user.name) + '</div>' +
        '<ul class="dropdown-menu dropdown-menu-end shadow-sm">' +
          '<li><div class="dropdown-header"><strong>' + escapeHtml(user.name) + '</strong><br><span class="muted">' + escapeHtml(user.email || '') + '</span></div></li>' +
          '<li><hr class="dropdown-divider"></li>' +
          (hasMod('users') ? '<li><a class="dropdown-item" href="/users"><i class="bi bi-person me-2"></i>Profile</a></li>' : '') +
          (hasMod('settings') ? '<li><a class="dropdown-item" href="/settings"><i class="bi bi-sliders me-2"></i>Settings</a></li>' : '') +
          '<li><hr class="dropdown-divider"></li>' +
          '<li><form method="post" action="/logout"><button class="dropdown-item text-danger" type="submit"><i class="bi bi-box-arrow-right me-2"></i>Logout</button></form></li>' +
        '</ul>' +
      '</div>';

    document.querySelectorAll('.edy-branch').forEach(b => b.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.setItem('edy.branch', b.dataset.b);
      document.getElementById('edyBranchLabel').textContent = b.dataset.b;
    }));
    document.querySelectorAll('.edy-lang').forEach(b => b.addEventListener('click', (e) => {
      e.preventDefault();
      if (EDY.i18n) EDY.i18n.setLang(b.dataset.l);
      syncLangLabel();
    }));
    // The top-bar way back to the admin console. Leaving the business is the point:
    // a plain link would land on the Super Admin page still looking into that company,
    // which reads as though the click did nothing.
    const back = document.getElementById('edyBackToAdmin');
    if (back) back.addEventListener('click', e => {
      e.preventDefault();
      back.classList.add('busy');
      EDY.api.post('/api/businesses/leave')
        .then(() => { location.href = '/super-admin'; })
        .catch(err => {
          back.classList.remove('busy');
          EDY.ui.toast(err.message || 'Could not leave the business', 'danger');
        });
    });

    // Preview the page currently on screen. Guarded: print.js is loaded after ui.js
    // on every page, but a failed script must not take the top bar with it.
    const printBtn = document.getElementById('edyPrintBtn');
    if (printBtn) printBtn.addEventListener('click', () => {
      if (EDY.print && EDY.print.page) EDY.print.page();
      else EDY.ui.toast('Print is not available on this screen', 'warning');
    });

    wireSearch();
    loadNotifications();
    syncLangLabel();
  }

  function wireSearch() {
    const input = document.getElementById('edySearch');
    const menu = document.getElementById('edySearchMenu');
    if (!input) return;
    input.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== input) { e.preventDefault(); input.focus(); }
      if (e.key === 'Escape') menu.classList.remove('show');
    });
    input.addEventListener('focus', () => { if (input.value) showSearch(); });
    input.addEventListener('input', () => { if (input.value) showSearch(); else menu.classList.remove('show'); });
    const allItems = [];
    visibleNav().forEach(n => {
      if (n.children) n.children.filter(c => c.href).forEach(c => allItems.push({ label: n.label + ' / ' + c.label, href: c.href, icon: c.icon || n.icon }));
      else allItems.push({ label: n.label, href: n.href, icon: n.icon });
    });
    function showSearch() {
      const q = input.value.toLowerCase();
      menu.innerHTML = allItems
        .filter(i => i.label.toLowerCase().includes(q))
        .map(i => '<a class="dropdown-item d-flex align-items-center gap-2 py-2" href="' + i.href + '"><i class="bi ' + i.icon + ' muted"></i>' + escapeHtml(i.label) + '</a>')
        .join('') || '<div class="dropdown-item muted">No matches</div>';
      menu.classList.add('show');
    }
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.topbar-search')) menu.classList.remove('show');
    });
  }

  async function loadNotifications() {
    const menu = document.getElementById('edyNotifMenu');
    const dot = document.getElementById('edyNotifDot');
    if (!menu) return;
    try {
      const [lowStock, sales] = await Promise.all([
        EDY.api.get('/api/products/low-stock'),
        EDY.api.get('/api/sales-invoices').catch(() => [])
      ]);
      const items = [];
      (lowStock || []).slice(0, 4).forEach(p => {
        items.push('<a class="dropdown-item d-flex gap-2 py-2" href="/inventory"><i class="bi bi-exclamation-triangle-fill text-danger mt-1"></i><div><div class="fw-semibold fs-13">Low stock \u2013 ' + escapeHtml(p.name) + '</div><div class="muted fs-12">' + p.quantityInStock + ' left (min ' + (p.reorderLevel ?? 0) + ')</div></div></a>');
      });
      if (items.length) {
        dot.style.display = '';
        menu.innerHTML = '<div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom"><span class="section-label">Notifications</span><a href="/inventory" class="fs-13 text-primary">View all</a></div>' + items.join('');
      } else {
        dot.style.display = 'none';
        menu.innerHTML = '<div class="empty-state py-4"><i class="bi bi-bell"></i><h6 class="mt-2">All caught up</h6></div>';
      }
    } catch (e) {
      dot.style.display = 'none';
      menu.innerHTML = '<div class="dropdown-item muted">Notifications unavailable</div>';
    }
  }

  function active(pageKey) {
    document.querySelectorAll('[data-nav]').forEach(n => n.classList.toggle('active', n.dataset.nav === pageKey));
    const page = '/' + pageKey;
    document.querySelectorAll('.nav-group').forEach(g => {
      let match = false, matched = null;
      g.querySelectorAll('a.nav-item[data-nav]').forEach(a => {
        const href = (a.getAttribute('href') || '').split('?')[0];
        if (href === page) { match = true; matched = a; }
      });
      g.classList.toggle('open', match);
      const header = g.querySelector(':scope > .nav-item');
      if (header) header.classList.toggle('active', match);
      if (matched) matched.classList.add('active');
    });
  }

  function hasMod(key) {
    const mods = me && me.modules;
    if (!mods || !mods.length) return true;
    return mods.includes(key);
  }

  async function init(pageKey) {
    try {
      me = await EDY.api.get('/api/auth/me');
    } catch (e) {
      return;
    }
    // Money formatting reads EDY.settings, so load them before anything renders.
    // But first, prime the CSRF cookie so mutating requests work.
    try {
      await EDY.api.primeCsrf();
    } catch (e) { /* non-fatal */ }
    try {
      Object.assign(EDY.settings, await EDY.api.get('/api/settings'));
    } catch (e) {
      // keep the built-in defaults rather than blocking the page
    }
    // Bring the saved display language along on a browser that has not chosen one
    // yet: per-browser choice is the reader's, but a new device should not
    // silently start in the other language.
    try {
      if (EDY.settings && EDY.settings['app.language'] && window.localStorage.getItem('edy.language') == null) {
        if (EDY.i18n) EDY.i18n.setLang(EDY.settings['app.language']);
      }
    } catch (e) { /* non-fatal */ }
    if (me.modules && me.modules.length) {
      navItems = NAV.filter(n => !n.superAdminOnly || isSuperAdminFromToken());
    }
    // Super admin state: which business, if any, this session is looking into.
    // Fetched before the shell renders so the sidebar link and the "viewing as"
    // banner are right the first time rather than popping in afterwards.
    try {
      tenantCtx = await EDY.api.get('/api/businesses/context').catch(() => null);
    } catch (e) {
      tenantCtx = null;   // a 403 here just means "not a super admin"
    }
    // Every page loads tenant.js, but the app must still boot if one ever forgets.
    // An exception here would abort init() before shell() and leave the page
    // stuck on its loading spinner, so this is guarded rather than assumed.
    try {
      if (EDY.tenant) EDY.tenant.ctx = tenantCtx;
    } catch (e) { /* no tenant module on this page */ }

    const allowed = visibleNav();
    if (me.modules && me.modules.length && !allowed.some(n => n.key === pageKey)) {
      const first = allowed.find(n => me.modules.includes(n.key));
      const target = first && (first.href || (first.children && first.children[0].href)) || '/';
      location.href = target;
      return;
    }
    if (!shell(me)) return;
    renderBanner();
    active(pageKey);
    window.EDY.me = me;
    document.documentElement.style.setProperty('--app-ready', '1');
    if (window.PAGE && typeof window.PAGE.init === 'function') {
      setTimeout(() => {
        let done;
        try { done = window.PAGE.init(); } catch (e) { done = null; }
        // Once a page has finished drawing itself, stamp the section-level print
        // options on to it, and keep doing so as filters re-render the content.
        Promise.resolve(done)
          .then(() => { if (EDY.print) { EDY.print.scan(); EDY.print.observe(); } })
          .catch(() => {});
      }, 0);
    }
    document.body.style.opacity = '1';
  }

  /** True when /api/auth/me says so, before the business context has loaded. */
  function isSuperAdminFromToken() {
    return !!(me && (me.superAdmin === true || me.role === 'SUPER_ADMIN'));
  }

  /**
   * The "you are looking into another business" banner. It exists because every
   * page's numbers change when a super admin switches, and a banner that did not
   * say which company you were in would make that a trap.
   */
  function renderBanner() {
    if (!tenantCtx || !tenantCtx.superAdmin) return;
    const acting = tenantCtx.actingBusiness;
    const bar = document.createElement('div');
    bar.className = 'tenant-banner';
    if (acting) {
      bar.innerHTML =
        '<i class="bi bi-eye-fill"></i>' +
        '<span>Viewing <strong>' + escapeHtml(acting.name) + '</strong> — ' +
        'you are seeing everything this business sees.</span>' +
        '<button class="btn btn-sm btn-light ms-auto" id="edyLeaveBusiness" type="button">' +
        'Back to all businesses</button>';
    } else {
      bar.classList.add('tenant-banner-all');
      bar.innerHTML =
        '<i class="bi bi-buildings-fill"></i>' +
        '<span>You are seeing <strong>all businesses</strong> combined. ' +
        'Open one to see it on its own.</span>';
    }
    const mainBody = document.querySelector('.main-body');
    if (mainBody) mainBody.parentNode.insertBefore(bar, mainBody);

    const leave = document.getElementById('edyLeaveBusiness');
    if (leave) leave.addEventListener('click', async () => {
      leave.disabled = true;
      try {
        await EDY.api.post('/api/businesses/leave');
        location.reload();
      } catch (e) {
        EDY.ui.toast(e.message, 'danger');
        leave.disabled = false;
      }
    });
  }

  function branch() { return pickBranch(); }

  return { init, me: () => me, branch, tenant: () => tenantCtx };
})();

/* auto-boot: runs on every page load */
(function boot() {
  var key = document.body.getAttribute('data-page') || 'dashboard';
  if (typeof EDY.layout !== 'undefined') EDY.layout.init(key);
})();