/* EDY ERP — Users & Roles */
window.PAGE = {
  init: async function () {
    const box = document.getElementById('pageContent');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    let users = [];
    const getRoles = () => {
      try {
        const v = JSON.parse(localStorage.getItem('edy.roles') || '[]');
        if (Array.isArray(v) && v.length) return v;
      } catch (e) { }
      return ['Cashier', 'Manager', 'Admin'];
    };
    const setRoles = (r) => localStorage.setItem('edy.roles', JSON.stringify(r));
    let roles = getRoles();

    // Creating/editing/deleting users and roles is restricted to Administrators
    // server side (POST/PUT/DELETE /api/users -> 403). Viewing stays open to any
    // signed-in user, so only the mutating controls are hidden here.
    const isAdmin = !!(EDY.me && EDY.me.role === 'Administrator');

    box.innerHTML =
      '<div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">' +
      '<div><h1 class="page-title mb-1">Users &amp; Roles</h1><div class="page-sub">Manage system users, roles and access permissions</div></div>' +
      '<div class="d-flex gap-2">' +
      (isAdmin
        ? '<button class="btn btn-ghost" id="btnRoles"><i class="bi bi-shield-plus me-1"></i>Add Role</button>' +
          '<button class="btn btn-primary" id="btnAdd"><i class="bi bi-person-plus me-1"></i>Add User</button>'
        : '<span class="badge bg-soft-gray align-self-center px-3 py-2"><i class="bi bi-lock me-1"></i>Read only \u2014 Administrator only can edit</span>') +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-body">' +
      '<div class="d-flex flex-wrap gap-2 mb-3">' +
      '<div class="topbar-search" style="max-width:320px"><i class="bi bi-search"></i><input id="tblSearch" placeholder="Search name, username, role&hellip;"></div>' +
      '<button class="btn btn-ghost ms-auto" id="btnCsv"><i class="bi bi-download me-1"></i>CSV</button>' +
      '</div>' +
      '<div class="table-wrap"><table class="table" id="uTable"></table></div>' +
      '</div></div>' +

      '<div class="modal fade" id="rolesModal" tabindex="-1">' +
      '<div class="modal-dialog modal-dialog-centered">' +
      '<div class="modal-content">' +
      '<div class="modal-header"><h5 class="modal-title"><i class="bi bi-shield-plus me-2 text-primary"></i>Manage Roles</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>' +
      '<div class="modal-body">' +
      '<div class="muted fs-13 mb-3">Add or remove custom roles. Changing a role here does not delete users already assigned to it.</div>' +
      '<div class="d-flex gap-2 mb-3">' +
      '<input class="form-control" id="rName" placeholder="e.g. Accountant, Supervisor, Trainee&hellip;">' +
      '<button class="btn btn-primary flex-shrink-0" id="btnAddRole"><i class="bi bi-plus-lg me-1"></i>Add</button>' +
      '</div>' +
      '<div id="roleList" class="d-grid gap-2"></div>' +
      '</div>' +
      '<div class="modal-footer"><button type="button" class="btn btn-ghost" data-bs-dismiss="modal">Done</button></div>' +
      '</div></div></div>' +
      '<div class="modal fade" id="userModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered modal-lg"><div class="modal-content"><div class="modal-header"><h5 class="modal-title" id="umTitle">Add User</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>' +
      '<div class="modal-body"><form id="userForm">' +
      '<div class="mb-3"><label class="form-label">Username *</label><input class="form-control" id="uUser" required></div>' +
      '<div class="row g-3">' +
      '<div class="col-md-6"><label class="form-label">Full Name</label><input class="form-control" id="uName"></div>' +
      '<div class="col-md-6"><label class="form-label">Password</label><input class="form-control" id="uPass" type="password" placeholder="Leave blank to keep current"></div>' +
      '<div class="col-md-6"><label class="form-label">Role</label><select class="form-select" id="uRole"></select></div>' +
      '<div class="col-md-6"><label class="form-label">Email</label><input class="form-control" id="uEmail" type="email"></div>' +
      '<div class="col-md-6"><label class="form-label">Phone</label><input class="form-control" id="uPhone"></div>' +
      '<div class="col-md-6"><label class="form-label">Branch</label><input class="form-control" id="uBranch"></div>' +
      '<div class="col-md-6"><div class="form-check mt-4"><input class="form-check-input" type="checkbox" id="uActive" checked><label class="form-check-label">Active</label></div></div>' +
      '<div class="col-md-6"></div>' +
      '</div>' +
      '</form></div>' +
      '<div class="modal-footer"><button type="button" class="btn btn-ghost" data-bs-dismiss="modal">Cancel</button><button class="btn btn-primary" id="btnSaveUser"><i class="bi bi-check-lg me-1"></i>Save</button></div>' +
      '</div></div></div>';

    function fillRoleSelect() {
      const sel = document.getElementById('uRole');
      if (!sel) return;
      sel.innerHTML = roles.map(r =>
        '<option value="' + esc(r) + '">' + esc(r) + '</option>').join('') +
        '<option value="__custom" disabled>+ custom comes from Manage Roles</option>';
    }

    function openRoles() {
      const body = document.getElementById('roleList');
      body.innerHTML = roles.map(r =>
        '<div class="d-flex justify-content-between align-items-center border rounded p-2">' +
        '<span><i class="bi bi-shield-check me-2 text-primary"></i>' + esc(r) + '</span>' +
        (roles.length <= 1 ? '' :
          '<button class="btn btn-ghost btn-sm text-danger" data-drole="' + esc(r) + '"><i class="bi bi-x-lg"></i></button>') +
        '</div>').join('');
      body.querySelectorAll('[data-drole]').forEach(b => b.addEventListener('click', () => {
        roles = roles.filter(x => x !== b.dataset.drole);
        setRoles(roles);
        openRoles(); fillForm(null); fillRoleSelect();
      }));
      if (window.EDY && EDY.ui && EDY.ui.openModal) EDY.ui.openModal('rolesModal');
    }

    if (isAdmin) document.getElementById('btnRoles').addEventListener('click', openRoles);
    document.getElementById('btnAddRole').addEventListener('click', () => {
      const input = document.getElementById('rName');
      const v = (input.value || '').trim();
      if (!v) { if (EDY.ui.toast) EDY.ui.toast('Enter a role name', 'warning'); return; }
      if (roles.some(x => x.toLowerCase() === v.toLowerCase())) { if (EDY.ui.toast) EDY.ui.toast('That role already exists', 'warning'); return; }
      roles.push(v);
      setRoles(roles);
      input.value = '';
      openRoles(); fillRoleSelect();
      if (EDY.ui.toast) EDY.ui.toast('Role "' + v + '" added');
    });
    document.getElementById('rName').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('btnAddRole').click(); });
    document.getElementById('btnCsv').addEventListener('click', () => {
      const head = 'Username,Full Name,Email,Role,Branch,Phone,Active';
      const rows = users.map(u => [u.username, u.fullName || '', u.email || '', u.role || '', u.branch || '', u.phone || '', u.active !== false ? 'Yes' : 'No']
        .map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','));
      const blob = new Blob(['\ufeff' + head + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'users.csv'; a.click();
    });

    function roleBadge(role) {
      const map = { Admin: 'bg-soft-purple', Administrator: 'bg-soft-purple', Manager: 'bg-soft-blue', Cashier: 'bg-soft-green', Accountant: 'bg-soft-amber', Viewer: 'bg-soft-gray' };
      return '<span class="badge ' + (map[role] || 'bg-soft-gray') + '">' + esc(role) + '</span>';
    }

    function render() {
      fillRoleSelect();
      if (!window.EDY || !EDY.ui || !EDY.ui.table) return;
      EDY.ui.table({
        el: document.getElementById('uTable'),
        searchInput: document.getElementById('tblSearch'),
        data: users,
        pageSize: 12,
        columns: [
          { key: 'fullName', label: 'User', render: (r) => {
            const display = r.fullName || r.username;
            return '<div class="d-flex align-items-center gap-2">' + EDY.avatar(display, 36) + '<div><div class="fw-bold">' + esc(display) + '</div><div class="muted fs-12">@' + esc(r.username) + '</div></div></div>'; } },
          { key: 'email', label: 'Email', render: (r) => esc(r.email || '\u2014') },
          { key: 'role', label: 'Role', render: (r) => roleBadge(r.role) },
          { key: 'branch', label: 'Branch', render: (r) => esc(r.branch || '\u2014') },
          { key: 'active', label: 'Status', render: (r) => r.active !== false ? '<span class="badge bg-soft-green">Active</span>' : '<span class="badge bg-soft-gray">Inactive</span>' },
          { key: 'id', label: 'Actions', render: (r) => isAdmin
            ? '<button class="btn btn-soft-primary btn-icon me-1" data-edit="' + r.id + '" title="Edit"><i class="bi bi-pencil"></i></button>' +
              '<button class="btn btn-soft-danger btn-icon" data-del="' + r.id + '" title="Delete"><i class="bi bi-trash"></i></button>'
            : '<span class="muted fs-12">&mdash;</span>' }
        ]
      });
      if (!isAdmin) return;
      box.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openEdit(Number(b.dataset.edit))));
      box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => removeRole(Number(b.dataset.del))));
    }

    function fillForm(u) {
      fillRoleSelect();
      document.getElementById('uUser').value = u ? u.username : '';
      document.getElementById('uName').value = u ? u.fullName || '' : '';
      document.getElementById('uRole').value = u ? u.role || 'Cashier' : 'Cashier';
      document.getElementById('uEmail').value = u ? u.email || '' : '';
      document.getElementById('uPhone').value = u ? u.phone || '' : '';
      document.getElementById('uBranch').value = u ? u.branch || '' : '';
      document.getElementById('uActive').checked = u ? u.active !== false : true;
      document.getElementById('umTitle').textContent = u ? 'Edit User' : 'Add User';
    }

    if (isAdmin) document.getElementById('btnAdd').addEventListener('click', () => { fillForm(null); if (EDY.ui.openModal) EDY.ui.openModal('userModal'); });

    function openEdit(id) { fillForm(users.find(x => x.id === id)); if (EDY.ui.openModal) EDY.ui.openModal('userModal'); }
    async function removeRole(id) {
      const u = users.find(x => x.id === id);
      if (u && u.username === 'admin') { if (EDY.ui.toast) EDY.ui.toast('Cannot delete the admin user', 'warning'); return; }
      const ok = await (EDY.ui.confirm ? EDY.ui.confirm('Delete user?', 'Delete "' + (u.fullName || u.username) + '"? They will lose access immediately.') : true);
      if (!ok) return;
      try {
        await EDY.api.del('/api/users/' + id);
        users = users.filter(x => x.id !== id);
        render(); if (EDY.ui.toast) EDY.ui.toast('User deleted');
      } catch (e) { if (EDY.ui.toast) EDY.ui.toast(e.message, 'error'); }
    }

    document.getElementById('userForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('uUser').dataset.uid || '';
      const payload = {
        username: document.getElementById('uUser').value.trim(),
        fullName: document.getElementById('uName').value.trim() || null,
        role: document.getElementById('uRole').value,
        email: document.getElementById('uEmail').value.trim() || null,
        phone: document.getElementById('uPhone').value.trim() || null,
        branch: document.getElementById('uBranch').value.trim() || null,
        active: document.getElementById('uActive').checked
      };
      const pass = document.getElementById('uPass').value;
      if (pass) payload.password = pass;
      try {
        if (id) await EDY.api.put('/api/users/' + id, payload);
        else await EDY.api.post('/api/users', payload);
        if (EDY.ui.closeModal) EDY.ui.closeModal('userModal');
        users = await EDY.api.get('/api/users');
        render(); if (EDY.ui.toast) EDY.ui.toast(id ? 'User updated' : 'User created');
      } catch (err) { if (EDY.ui.toast) EDY.ui.toast(err.message, 'error'); }
    });

    users = await EDY.api.get('/api/users').catch(() => []);
    render();
    fillForm(null);
  }
};
