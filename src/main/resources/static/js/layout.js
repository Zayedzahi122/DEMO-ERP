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

  const NAV = [
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
    { key: 'reports', icon: 'bi-graph-up-arrow', label: 'Reports', children: [
      { key: 'rep-main', href: '/reports', icon: 'bi-bar-chart-line', label: 'Reports & Analytics' },
      { key: 'rep-tax', href: '/reports', icon: 'bi-percent', label: 'VAT / Tax Report' },
      { key: 'rep-charts', href: '/reports', icon: 'bi-pie-chart', label: 'Charts' }
    ]},
    { key: 'users', href: '/users', icon: 'bi-person-gear', label: 'Users & Roles' },
    { key: 'settings', href: '/settings', icon: 'bi-sliders', label: 'Settings' }
  ];

  const BRANCHES = ['Main Branch \u2013 Muscat', 'Sohar Branch', 'Salalah Branch'];
  let me = null;
  let navItems = NAV;

  function shell(user) {
    const main = document.getElementById('pageContent');
    if (!main) return false;
    const shellDiv = document.createElement('div');
    shellDiv.className = 'app-shell';
    main.parentNode.insertBefore(shellDiv, main);

    const navHtml = navItems.map(n => {
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

    shellDiv.innerHTML =
      '<aside class="sidebar" id="edySidebar">' +
        '<div class="sidebar-brand">' +
          '<div class="logo">E</div>' +
          '<div><div class="brand-name">DEMO ERP</div><div class="brand-sub">Business Suite</div></div>' +
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

  function topbar(user, bodyMain) {
    const branch = localStorage.getItem('edy.branch') || BRANCHES[0];
    const tb = document.getElementById('edyTopbar');
    tb.innerHTML =
      '<button class="icon-btn d-lg-none" id="edyMenuBtn" type="button"><i class="bi bi-list"></i></button>' +
      '<div class="topbar-search">' +
        '<i class="bi bi-search"></i>' +
        '<input type="text" id="edySearch" placeholder="Search pages, products, invoices\u2026" autocomplete="off">' +
        '<kbd>/</kbd>' +
        '<div class="dropdown-menu" id="edySearchMenu" style="width:100%"></div>' +
      '</div>' +
      '<div class="tb-divider d-none d-md-block"></div>' +
      '<div class="dropdown">' +
        '<button class="icon-btn" id="edyLangBtn" data-bs-toggle="dropdown" aria-label="Language" title="Language"><i class="bi bi-globe2"></i></button>' +
        '<ul class="dropdown-menu shadow-sm">' +
          '<li><button class="dropdown-item edy-lang" data-l="en" type="button">English</button></li>' +
          '<li><button class="dropdown-item edy-lang" data-l="ar" type="button">العربية</button></li>' +
        '</ul>' +
      '</div>' +
      '<div class="dropdown">' +
        '<button class="branch-pill" data-bs-toggle="dropdown"><i class="bi bi-geo-alt-fill"></i>' +
        '<span id="edyBranchLabel">' + escapeHtml(branch) + '</span><i class="bi bi-chevron-down" style="font-size:11px"></i></button>' +
        '<ul class="dropdown-menu shadow-sm">' +
          BRANCHES.map(b => '<li><a class="dropdown-item edy-branch" data-b="' + escapeHtml(b) + '" href="#">' + escapeHtml(b) + '</a></li>').join('') +
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
    }));
    wireSearch();
    loadNotifications();
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
    navItems.forEach(n => {
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
    if (me.modules && me.modules.length) {
      navItems = NAV.filter(n => me.modules.includes(n.key));
    }
    if (me.modules && me.modules.length && !me.modules.includes(pageKey)) {
      const first = navItems[0] && (navItems[0].href || (navItems[0].children && navItems[0].children[0].href)) || '/';
      location.href = first;
      return;
    }
    if (!shell(me)) return;
    active(pageKey);
    window.EDY.me = me;
    document.documentElement.style.setProperty('--app-ready', '1');
    if (window.PAGE && typeof window.PAGE.init === 'function') {
      setTimeout(() => window.PAGE.init(), 0);
    }
    document.body.style.opacity = '1';
  }

  function branch() { return localStorage.getItem('edy.branch') || BRANCHES[0]; }

  return { init, me: () => me, branch };
})();

/* auto-boot: runs on every page load */
(function boot() {
  var key = document.body.getAttribute('data-page') || 'dashboard';
  if (typeof EDY.layout !== 'undefined') EDY.layout.init(key);
})();