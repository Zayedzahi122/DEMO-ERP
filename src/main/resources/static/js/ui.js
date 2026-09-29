/* EDY ERP — UI helpers: toasts, confirm, modals, tables, charts */
window.EDY = window.EDY || {};

EDY.ui = (() => {

  /* ---------- Toasts ---------- */
  let toastBox = null;
  function ensureToastBox() {
    if (!toastBox) {
      toastBox = document.createElement('div');
      toastBox.className = 'toast-container-c';
      document.body.appendChild(toastBox);
    }
    return toastBox;
  }
  function toast(message, type = 'success', title) {
    const icons = { success: 'bi-check-circle-fill text-success', error: 'bi-x-circle-fill text-danger', warning: 'bi-exclamation-triangle-fill text-warning', info: 'bi-info-circle-fill text-primary' };
    const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info' };
    const el = document.createElement('div');
    el.className = 'edy-toast';
    el.innerHTML = '<i class="bi ' + (icons[type] || icons.info) + '"></i>' +
      '<div><div class="tt">' + (title || titles[type]) + '</div><div class="tm">' + message + '</div></div>';
    ensureToastBox().appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3600);
    return el;
  }

  /* ---------- Confirm dialog ---------- */
  function confirmDialog(title, message, okText = 'Confirm', danger = true) {
    return new Promise((resolve) => {
      const id = 'edyConfirm';
      const old = document.getElementById(id);
      if (old) old.remove();
      const wrap = document.createElement('div');
      wrap.id = id;
      wrap.className = 'modal fade';
      wrap.innerHTML =
        '<div class="modal-dialog modal-dialog-centered modal-sm"><div class="modal-content">' +
        '<div class="modal-body text-center p-4">' +
        '<div class="mb-2" style="font-size:38px">' + (danger ? '<i class="bi bi-exclamation-triangle-fill text-danger"></i>' : '<i class="bi bi-question-circle-fill text-primary"></i>') + '</div>' +
        '<h5 class="fw-bold mb-1">' + title + '</h5><p class="muted mb-0 fs-13">' + message + '</p></div>' +
        '<div class="modal-footer justify-content-center border-0 pt-0"><button class="btn btn-ghost btn-cancel">Cancel</button>' +
        '<button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + ' btn-ok">' + okText + '</button></div>' +
        '</div></div>';
      document.body.appendChild(wrap);
      const modal = new bootstrap.Modal(wrap, { backdrop: 'static' });
      let done = false;
      const finish = (v) => { if (!done) { done = true; modal.hide(); wrap.addEventListener('hidden.bs.modal', () => wrap.remove()); resolve(v); } };
      wrap.querySelector('.btn-ok').addEventListener('click', () => finish(true));
      wrap.querySelector('.btn-cancel').addEventListener('click', () => finish(false));
      modal.show();
    });
  }

  /* ---------- Modal open/close ---------- */
  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const modal = bootstrap.Modal.getOrCreateInstance(el);
    modal.show();
  }
  function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const modal = bootstrap.Modal.getInstance(el);
    if (modal) modal.hide();
  }

  /* ---------- Loading state ---------- */
  function loading(el, on, type = 'spinner') {
    if (!el) return;
    if (on && type === 'spinner') el.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>';
    if (on && type === 'card') el.innerHTML = '<div class="card"><div class="card-body"><div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></div></div></div>';
    if (!on) { const sp = el.querySelector('.spinner-border'); if (sp && el.innerHTML.trim().length < 120) el.innerHTML = ''; }
  }

  /* ---------- Table renderer with search + pagination ---------- */
  function renderTable({
    el, columns, data = [], pageSize = 10, searchInput, searchKeys, emptyText = 'No records found',
    onRowClick
  }) {
    let rows = [...data];
    let page = 1;
    let q = '';

    function totalFiltered() {
      if (!q) return rows;
      const needle = q.toLowerCase();
      const keys = searchKeys || columns.map(c => c.key).filter(k => k);
      return rows.filter(r => keys.some(k => {
        const v = r[k];
        if (v === null || v === undefined) return false;
        return String(v.name ?? v).toLowerCase().includes(needle);
      }));
    }

    function pages() {
      const filtered = totalFiltered();
      return Math.max(1, Math.ceil(filtered.length / pageSize));
    }

    function cellText(f, r, c) {
      if (c.render) return c.render(r);
      if (c.money) return EDY.fmt.money(r[f]);
      if (c.number) return EDY.fmt.num(r[f]);
      if (c.date) return EDY.fmt.date(r[f]);
      if (c.datetime) return EDY.fmt.datetime(r[f]);
      if (c.badge) return c.badge(r[f], r);
      const v = r[f];
      if (v === null || v === undefined) return '\u2014';
      if (typeof v === 'object' && v !== null) {
        if ('name' in v) return v.name;
        if ('username' in v) return v.username;
        return JSON.stringify(v).substring(0, 24);
      }
      return v;
    }

    function render() {
      const filtered = totalFiltered();
      const max = pages();
      if (page > max) page = max;
      if (page < 1) page = 1;
      const start = (page - 1) * pageSize;
      const slice = filtered.slice(start, start + pageSize);

      let html = '<div class="table-responsive"><table class="table align-middle"></table></div>'; // placeholder
      let table = el.classList.contains('table') ? el : null;
      let thead = '';
      if (table) {
        table.classList.add('align-middle');
      }
      thead = '<tr>' + columns.map(c => '<th>' + (c.label || '\u00a0') + '</th>').join('') + '</tr>';
      let tbody = '';
      if (!slice.length) {
        tbody = '<tr><td colspan="' + columns.length + '"><div class="empty-state"><i class="bi bi-inbox"></i><h6 class="mt-2">' + emptyText + '</h6></div></td></tr>';
      } else {
        tbody = slice.map(r => '<tr class="' + (onRowClick ? 'hoverable' : '') + '" data-id="' + (r.id ?? '') + '">' +
          columns.map(c => '<td class="' + (c.className || '') + '">' + cellText(c.key, r, c) + '</td>').join('') + '</tr>').join('');
      }
      let footer = '';
      if (filtered.length > pageSize) {
        let pnums = '';
        pnums += '<button class="btn btn-sm btn-ghost me-1" data-p="' + (page - 1) + '"' + (page > 1 ? '' : ' disabled') + '><i class="bi bi-chevron-left me-1"></i>Prev</button>';
        for (let p = 1; p <= max; p++) pnums += '<button class="btn btn-sm ' + (p === page ? 'btn-primary' : 'btn-ghost') + ' mx-1" data-p="' + p + '">' + p + '</button>';
        pnums += '<button class="btn btn-sm btn-ghost ms-1" data-p="' + (page + 1) + '"' + (page < max ? '' : ' disabled') + '>Next<i class="bi bi-chevron-right ms-1"></i></button>';
        footer = '<div class="d-flex justify-content-between align-items-center border-top pt-2 mt-2 px-1">' +
          '<span class="muted fs-13">Showing ' + (start + 1) + '\u2013' + Math.min(start + pageSize, filtered.length) + ' of ' + filtered.length + '</span>' +
          '<div>' + pnums + '</div></div>';
      } else if (filtered.length > 0) {
        footer = '<div class="border-top pt-2 mt-2 px-1 muted fs-13">' + filtered.length + ' record' + (filtered.length > 1 ? 's' : '') + '</div>';
      }

      // pagination footer must render for both table elements and wrapper divs;
      // a stale pager from a previous render would otherwise stack up
      const wrapper = table ? table.parentNode : el;
      const stalePager = wrapper.querySelector('.ed-pager');
      if (stalePager) stalePager.remove();
      const footerEl = footer ? (() => { const d = document.createElement('div'); d.className = 'ed-pager'; d.innerHTML = footer; return d; })() : null;
      if (table) {
        table.innerHTML = '';
        const t1 = document.createElement('thead'); t1.innerHTML = thead; table.appendChild(t1);
        const t2 = document.createElement('tbody'); t2.innerHTML = tbody; table.appendChild(t2);
        if (footerEl) wrapper.insertBefore(footerEl, table.nextSibling);
      } else {
        const r1 = el.querySelector('.table-responsive');
        r1.innerHTML = '<table class="table align-middle"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table>';
        if (footerEl) wrapper.appendChild(footerEl);
      }
      wrapper.querySelectorAll('button[data-p]').forEach(b => b.addEventListener('click', () => { page = Number(b.dataset.p); render(); }));
      if (onRowClick) el.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => onRowClick(Number(tr.dataset.id))));
    }

    function search(value) { q = (value || '').trim(); page = 1; render(); }
    function refresh(newData) { rows = newData || data; page = 1; render(); }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => search(e.target.value));
    }
    render();
    return { refresh, search, count: () => totalFiltered().length };
  }

  /* ---------- Simple charts wrapper ---------- */
  const charts = {};
  function chart(el, config) {
    if (!el) return;
    const existing = charts[el.id];
    if (existing) existing.destroy();
    const instance = new Chart(el.getContext('2d'), config);
    charts[el.id] = instance;
    return instance;
  }
  function baseFont() {
    return { family: "Inter, 'Segoe UI', sans-serif", size: 12 };
  }

  /* ---------- Generic form -> object ---------- */
  function formData(formEl) {
    const fd = new FormData(formEl);
    const obj = {};
    fd.forEach((v, k) => {
      if (k.endsWith('[]')) { const key = k.slice(0, -2); (obj[key] = obj[key] || []).push(v); return; }
      obj[k] = v === '' ? null : v;
    });
    return obj;
  }
  function setForm(formEl, data) {
    const els = formEl.elements;
    for (const k in data) {
      const field = els[k];
      if (!field) continue;
      const v = data[k];
      if (field.type === 'checkbox') field.checked = !!v;
      else field.value = v ?? '';
    }
  }
  function clearForm(formEl) { formEl.reset(); }

  /* ---------- Inputs with OMR prefix ---------- */
  function moneyInput(el) {
    if (el.dataset.bound === '1') return;
    el.dataset.bound = '1';
    const wrap = document.createElement('div');
    wrap.className = 'input-group input-group-sm';
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    wrap.insertAdjacentHTML('afterbegin', '<span class="input-group-text" style="border-radius:10px 0 0 10px">\u0631.\u0639.</span>');
  }

  return { toast, confirm: confirmDialog, openModal, closeModal, loading, table: renderTable, chart, moneyInput,
    formData, setForm, clearForm, baseFont };
})();