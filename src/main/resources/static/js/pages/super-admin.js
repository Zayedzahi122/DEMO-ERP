/* EDY ERP — Super Admin: the businesses registry */
(function () {
  'use strict';

  const el = id => document.getElementById(id);
  let businesses = [];
  let nameById = {};

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /** Records excluding users, which is what decides whether a delete is allowed. */
  function recordCount(b) {
    if (!b || !b.counts) return 0;
    return Object.keys(b.counts)
      .filter(k => k !== 'users')
      .reduce((n, k) => n + (b.counts[k] || 0), 0);
  }

  /** The handful of numbers worth showing in the table; the rest live in the detail modal. */
  function summaryCounts(b) {
    const c = (b && b.counts) || {};
    return [
      { label: 'Products', n: c.products || 0 },
      { label: 'Customers', n: c.customers || 0 },
      { label: 'Invoices', n: (c.salesInvoices || 0) + (c.purchaseInvoices || 0) },
      { label: 'Users', n: b ? (b.userCount || 0) : 0 }
    ];
  }

  function render() {
    const host = el('bizTable');
    if (!host) return;

    if (!businesses.length) {
      host.innerHTML =
        '<div class="empty-state py-5">' +
          '<i class="bi bi-buildings"></i>' +
          '<h6 class="mt-2">No businesses yet</h6>' +
          '<p class="muted fs-13 mb-3">Create one to get started, or add your first user to it.</p>' +
          '<button class="btn btn-primary btn-sm" id="saEmptyNew"><i class="bi bi-plus-lg me-1"></i>New business</button>' +
        '</div>';
      const b = el('saEmptyNew');
      if (b) b.addEventListener('click', () => openCreate());
      return;
    }

    host.innerHTML =
      '<div class="table-responsive"><table class="table align-middle mb-0">' +
        '<thead><tr>' +
          '<th>Business</th><th>Code</th><th>Contact</th><th>Contents</th>' +
          '<th>Status</th><th class="text-end">Actions</th>' +
        '</tr></thead><tbody>' +
        businesses.map(b => {
          const acting = EDY.tenant.ctx && EDY.tenant.ctx.actingBusiness
            && EDY.tenant.ctx.actingBusiness.id === b.id;
          const records = recordCount(b);
          return '<tr' + (acting ? ' class="table-active"' : '') + '>' +
            '<td><div class="fw-semibold">' + esc(b.name) +
              (acting ? ' <span class="badge bg-primary-subtle text-primary ms-1">Viewing</span>' : '') +
            '</div>' +
            (b.legalName ? '<div class="muted fs-12">' + esc(b.legalName) + '</div>' : '') +
            (b.vatNo ? '<div class="muted fs-12">VAT ' + esc(b.vatNo) + '</div>' : '') + '</td>' +
            '<td>' + (b.code ? '<code class="fs-12">' + esc(b.code) + '</code>' : '<span class="muted">—</span>') + '</td>' +
            '<td class="fs-13">' +
              (b.phone ? '<div>' + esc(b.phone) + '</div>' : '') +
              (b.email ? '<div class="muted fs-12">' + esc(b.email) + '</div>' : '') +
              (!b.phone && !b.email ? '<span class="muted">—</span>' : '') +
            '</td>' +
            '<td><div class="d-flex flex-wrap gap-1">' +
              summaryCounts(b).map(c =>
                '<span class="badge bg-light text-body border fs-11" title="' + esc(c.label) + '">' +
                c.n + ' ' + esc(c.label.toLowerCase()) + '</span>').join('') +
            '</div></td>' +
            '<td>' + (b.active
              ? '<span class="badge bg-success-subtle text-success">Active</span>'
              : '<span class="badge bg-secondary-subtle text-secondary">Deactivated</span>') + '</td>' +
            '<td class="text-end text-nowrap">' +
              '<button class="btn btn-sm btn-ghost" data-act="users" data-id="' + b.id + '" title="Users"><i class="bi bi-people"></i></button> ' +
              '<button class="btn btn-sm btn-ghost" data-act="enter" data-id="' + b.id + '" title="' +
                (b.active ? 'Look inside this business' : 'Reactivate to look inside') + '"' +
                (b.active ? '' : ' disabled') + '><i class="bi bi-box-arrow-in-right"></i></button> ' +
              '<button class="btn btn-sm btn-ghost" data-act="edit" data-id="' + b.id + '" title="Edit"><i class="bi bi-pencil"></i></button> ' +
              '<button class="btn btn-sm btn-ghost" data-act="toggle" data-id="' + b.id + '" title="' +
                (b.active ? 'Deactivate' : 'Reactivate') + '"><i class="bi bi-' +
                (b.active ? 'toggle-on text-success' : 'toggle-off text-secondary') + '"></i></button> ' +
              '<button class="btn btn-sm btn-ghost" data-act="delete" data-id="' + b.id + '" title="' +
                (records ? 'Cannot delete: holds ' + records + ' records' : 'Delete') + '"' +
                (records ? ' disabled' : '') + '><i class="bi bi-trash"></i></button>' +
            '</td></tr>';
        }).join('') +
      '</tbody></table></div>';

    host.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = businesses.find(x => String(x.id) === btn.dataset.id);
        if (!b) return;
        ({
          users: () => openUsers(b),
          enter: () => enterBusiness(b),
          edit: () => openEdit(b),
          toggle: () => toggleActive(b),
          delete: () => removeBusiness(b)
        })[btn.dataset.act]();
      });
    });
  }

  // ------------------------------------------------------------- businesses

  function openCreate() {
    el('bmTitle').textContent = 'New Business';
    el('bId').value = '';
    ['bName', 'bCode', 'bLegal', 'bVat', 'bPhone', 'bEmail', 'bAddr', 'bLocs',
     'bAdminUser', 'bAdminPass', 'bAdminName'].forEach(i => { if (el(i)) el(i).value = ''; });
    el('bActive').checked = true;
    el('bAdminRole').value = 'Administrator';
    el('bmFirstUser').style.display = '';
    new bootstrap.Modal(el('bizModal')).show();
    setTimeout(() => el('bName').focus(), 300);
  }

  function openEdit(b) {
    el('bmTitle').textContent = 'Edit ' + b.name;
    el('bId').value = b.id;
    el('bName').value = b.name || '';
    el('bCode').value = b.code || '';
    el('bLegal').value = b.legalName || '';
    el('bVat').value = b.vatNo || '';
    el('bPhone').value = b.phone || '';
    el('bEmail').value = b.email || '';
    el('bAddr').value = b.address || '';
    el('bLocs').value = (b.locations && b.locations.length ? b.locations : []).join('\n');
    el('bActive').checked = !!b.active;
    // First-user fields only make sense while creating.
    el('bmFirstUser').style.display = 'none';
    new bootstrap.Modal(el('bizModal')).show();
  }

  async function saveBusiness(e) {
    e.preventDefault();
    const id = el('bId').value;
    const body = {
      name: el('bName').value.trim(),
      code: el('bCode').value.trim(),
      legalName: el('bLegal').value.trim(),
      vatNo: el('bVat').value.trim(),
      phone: el('bPhone').value.trim(),
      email: el('bEmail').value.trim(),
      address: el('bAddr').value.trim(),
      locations: el('bLocs').value.trim() || null,
      active: el('bActive').checked
    };
    const username = el('bAdminUser') ? el('bAdminUser').value.trim() : '';
    if (!id && username) {
      body.username = username;
      body.password = el('bAdminPass').value;
      body.fullName = el('bAdminName').value.trim();
      body.userRole = el('bAdminRole').value;
    }

    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      if (id) {
        await EDY.api.put('/api/businesses/' + id, body);
        EDY.ui.toast('Business updated', 'success');
      } else {
        await EDY.api.post('/api/businesses', body);
        EDY.ui.toast('Business created', 'success');
      }
      bootstrap.Modal.getInstance(el('bizModal')).hide();
      await load();
    } catch (err) {
      EDY.ui.toast(err.message, 'danger');
    } finally {
      btn.disabled = false;
    }
  }

  async function toggleActive(b) {
    const verb = b.active ? 'Deactivate' : 'Reactivate';
    const msg = b.active
      ? 'Deactivate "' + b.name + '"? Its ' + (b.userCount || 0) +
        ' user(s) will not be able to sign in. Nothing is deleted.'
      : 'Reactivate "' + b.name + '"? Its users will be able to sign in again.';
    if (!confirm(msg)) return;
    try {
      await EDY.api.post('/api/businesses/' + b.id + '/active', { active: !b.active });
      EDY.ui.toast(b.name + ' ' + (b.active ? 'deactivated' : 'reactivated'), 'success');
      await load();
    } catch (err) {
      EDY.ui.toast(err.message, 'danger');
    }
  }

  async function removeBusiness(b) {
    if (!confirm('Delete "' + b.name + '"? This cannot be undone.')) return;
    try {
      await EDY.api.del('/api/businesses/' + b.id);
      EDY.ui.toast('Business deleted', 'success');
      await load();
    } catch (err) {
      EDY.ui.toast(err.message, 'danger');
    }
  }

  /**
   * Switches this session into a business. Everything on every page then reflects
   * that business only, which is the whole point - but it is worth confirming,
   * because the numbers on screen are about to change company.
   */
  async function enterBusiness(b) {
    if (!confirm('Look inside "' + b.name + '"?\n\nYou will see everything this business sees, as its Administrator would. A banner will show while you are looking in.')) return;
    try {
      await EDY.tenant.enter(b.id);
      location.href = '/';
    } catch (err) {
      EDY.ui.toast(err.message, 'danger');
    }
  }

  // ------------------------------------------------------------------ users

  async function openUsers(b) {
    el('bumBizTitle').textContent = b.name + ' — Users';
    el('bumBody').innerHTML = '<div class="text-center py-4"><div class="spinner-border spinner-border-sm"></div></div>';
    el('bumFooter').innerHTML = '';
    new bootstrap.Modal(el('bizUsersModal')).show();

    let users = [];
    try {
      users = await EDY.api.get('/api/businesses/' + b.id + '/users');
    } catch (err) {
      el('bumBody').innerHTML = '<div class="alert alert-danger mb-0">' + esc(err.message) + '</div>';
      return;
    }

    const rows = users.map(u =>
      '<tr>' +
        '<td><div class="fw-semibold">' + esc(u.username) +
          (u.superAdmin ? ' <span class="badge bg-warning-subtle text-warning-emphasis ms-1" title="Can manage every business">Super admin</span>' : '') +
        '</div>' +
        (u.fullName ? '<div class="muted fs-12">' + esc(u.fullName) + '</div>' : '') + '</td>' +
        '<td>' + esc(u.role || '—') + '</td>' +
        '<td class="fs-13">' + (u.email ? esc(u.email) : '<span class="muted">—</span>') +
          (u.lastLogin ? '<div class="muted fs-12">Last in ' + esc(String(u.lastLogin).replace('T', ' ').slice(0, 16)) + '</div>' : '') + '</td>' +
        '<td>' + (u.active
          ? '<span class="badge bg-success-subtle text-success">Active</span>'
          : '<span class="badge bg-secondary-subtle text-secondary">Disabled</span>') + '</td>' +
        '<td class="text-end text-nowrap">' +
          '<button class="btn btn-sm btn-ghost" data-uact="edit" data-uid="' + u.id + '" title="Edit"><i class="bi bi-pencil"></i></button> ' +
          '<button class="btn btn-sm btn-ghost" data-uact="toggle" data-uid="' + u.id + '" title="' +
            (u.active ? 'Disable' : 'Enable') + '"><i class="bi bi-' +
            (u.active ? 'toggle-on text-success' : 'toggle-off text-secondary') + '"></i></button> ' +
          '<button class="btn btn-sm btn-ghost" data-uact="delete" data-uid="' + u.id + '" title="Delete"><i class="bi bi-trash"></i></button>' +
        '</td></tr>').join('');

    el('bumBody').innerHTML = users.length
      ? '<div class="table-responsive"><table class="table align-middle mb-0">' +
          '<thead><tr><th>User</th><th>Role</th><th>Contact</th><th>Status</th>' +
          '<th class="text-end">Actions</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      : '<div class="empty-state py-4"><i class="bi bi-person-x"></i><h6 class="mt-2">No users yet</h6>' +
        '<p class="muted fs-13">Nobody can sign in to this business yet.</p></div>';

    el('bumFooter').innerHTML =
      '<button class="btn btn-ghost" data-bs-dismiss="modal">Close</button>' +
      '<button class="btn btn-outline-secondary ms-auto" id="bumAdd"><i class="bi bi-person-plus me-1"></i>Add user</button>' +
      '<button class="btn btn-primary" id="bumEnter"' + (b.active ? '' : ' disabled') + '>' +
        '<i class="bi bi-box-arrow-in-right me-1"></i>Open this business</button>';

    el('bumAdd').addEventListener('click', () => openUserForm(b, null));
    const enter = el('bumEnter');
    if (enter && !enter.disabled) enter.addEventListener('click', () => enterBusiness(b));

    el('bumBody').querySelectorAll('button[data-uact]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const u = users.find(x => String(x.id) === btn.dataset.uid);
        if (!u) return;
        if (btn.dataset.uact === 'edit') return openUserForm(b, u);
        if (btn.dataset.uact === 'toggle') {
          try {
            await EDY.api.put('/api/businesses/' + b.id + '/users/' + u.id, {
              username: u.username, role: u.role, fullName: u.fullName,
              email: u.email, phone: u.phone, branch: u.branch,
              modules: u.modules, active: !u.active
            });
            EDY.ui.toast(u.username + ' ' + (!u.active ? 'enabled' : 'disabled'), 'success');
            openUsers(b);
            load(true);
          } catch (err) { EDY.ui.toast(err.message, 'danger'); }
          return;
        }
        if (!confirm('Delete "' + u.username + '"? This cannot be undone.')) return;
        try {
          await EDY.api.del('/api/businesses/' + b.id + '/users/' + u.id);
          EDY.ui.toast('User deleted', 'success');
          openUsers(b);
          load(true);
        } catch (err) { EDY.ui.toast(err.message, 'danger'); }
      });
    });
  }

  function openUserForm(b, u) {
    el('bumTitle').textContent = u ? 'Edit ' + u.username : 'Add user to ' + b.name;
    el('buBizId').value = b.id;
    el('buId').value = u ? u.id : '';
    el('buUser').value = u ? u.username : '';
    el('buPass').value = '';
    el('buPassHint').textContent = u
      ? 'Leave blank to keep the current password.'
      : 'At least 6 characters.';
    el('buName').value = u ? (u.fullName || '') : '';
    el('buEmail').value = u ? (u.email || '') : '';
    el('buPhone').value = u ? (u.phone || '') : '';
    el('buBranch').value = u ? (u.branch || '') : '';
    el('buRole').value = u ? (u.role || 'Cashier') : 'Administrator';
    el('buActive').checked = u ? !!u.active : true;
    new bootstrap.Modal(el('bizUserModal')).show();
  }

  async function saveUser(e) {
    e.preventDefault();
    const bizId = el('buBizId').value;
    const userId = el('buId').value;
    const body = {
      username: el('buUser').value.trim(),
      password: el('buPass').value,
      fullName: el('buName').value.trim(),
      email: el('buEmail').value.trim(),
      phone: el('buPhone').value.trim(),
      role: el('buRole').value,
      branch: el('buBranch').value.trim(),
      active: el('buActive').checked
    };
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      if (userId) await EDY.api.put('/api/businesses/' + bizId + '/users/' + userId, body);
      else await EDY.api.post('/api/businesses/' + bizId + '/users', body);
      EDY.ui.toast(userId ? 'User updated' : 'User added', 'success');
      bootstrap.Modal.getInstance(el('bizUserModal')).hide();
      await load();
      const b = businesses.find(x => String(x.id) === String(bizId));
      if (b) openUsers(b);
    } catch (err) {
      EDY.ui.toast(err.message, 'danger');
    } finally {
      btn.disabled = false;
    }
  }

  // ------------------------------------------------------------------ boot

  async function load(quiet) {
    try {
      businesses = await EDY.api.get('/api/businesses');
      nameById = {};
      businesses.forEach(b => { nameById[b.id] = b.name; });
      render();
      renderTotals();
    } catch (err) {
      if (!quiet) {
        el('bizTable').innerHTML =
          '<div class="alert alert-danger mb-0">' + esc(err.message) + '</div>';
      }
    }
  }

  function renderTotals() {
    const host = el('saStats');
    if (!host) return;
    const active = businesses.filter(b => b.active).length;
    const users = businesses.reduce((n, b) => n + (b.userCount || 0), 0);
    host.innerHTML =
      stat('Businesses', businesses.length, 'bi-buildings') +
      stat('Active', active, 'bi-check-circle') +
      stat('Users across all', users, 'bi-people') +
      stat('Viewing', EDY.tenant.isActing() ? EDY.tenant.actingName() : 'All businesses', 'bi-eye');
  }

  function stat(label, value, icon) {
    return '<div class="col-6 col-lg-3"><div class="card stat-card h-100">' +
      '<div class="card-body py-3">' +
        '<div class="d-flex align-items-center gap-2 mb-1">' +
          '<i class="bi ' + icon + ' muted"></i><span class="muted fs-12">' + esc(label) + '</span></div>' +
        '<div class="fs-20 fw-bold text-truncate" title="' + esc(value) + '">' + esc(value) + '</div>' +
      '</div></div></div>';
  }

  async function init() {
    if (!EDY.tenant.isSuperAdmin()) {
      document.getElementById('pageContent').innerHTML =
        '<div class="empty-state py-5"><i class="bi bi-shield-lock"></i>' +
        '<h6 class="mt-2">Super Admin access only</h6>' +
        '<p class="muted fs-13">This console is for the platform owner account. Sign in with it to manage businesses.</p>' +
        '<form method="post" action="/logout" class="mt-3"><button class="btn btn-primary" type="submit">Sign in as the platform owner</button></form></div>';
      return;
    }

    document.getElementById('pageContent').innerHTML =
      '<div class="page-head">' +
        '<div><h1 class="page-title">Super Admin</h1>' +
        '<p class="page-sub">Every business on this system. Open one to see it exactly as its own staff do.</p></div>' +
        '<button class="btn btn-primary" id="saNew"><i class="bi bi-plus-lg me-1"></i>New business</button>' +
      '</div>' +
      '<div class="row g-3 mb-3" id="saStats"></div>' +
      '<div class="card"><div class="card-body p-0"><div id="bizTable"></div></div></div>';

    el('saNew').addEventListener('click', () => openCreate());
    el('bizForm').addEventListener('submit', saveBusiness);
    el('bizUserForm').addEventListener('submit', saveUser);

    await load();
  }

  window.PAGE = { init };
})();
