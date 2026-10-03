/* EDY ERP - cash register (open/close gate for POS sales).
 * - Persists the open register + closed-session history in localStorage.
 * - POS sales are blocked until a register is opened.
 * - Sales made with CASH while open accumulate on the register (cashIn);
 *   expected cash on close = opening float + cash sales.
 * Exposes EDY.register (state logic) and mount() (UI gate + chip). */
window.EDY = window.EDY || {};

(function () {
  const KEY = 'edy.register';

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && typeof raw === 'object') {
        raw.open = raw.open || null;
        raw.sessions = Array.isArray(raw.sessions) ? raw.sessions : [];
        return raw;
      }
    } catch (e) { /* ignore */ }
    return { open: null, sessions: [] };
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  let state = load();

  function getState() { return state; }
  function isOpen() { return !!(state.open && state.open.openedAt); }
  function openedAt() { return state.open ? state.open.openedAt : null; }
  function openingCash() { return state.open ? Number(state.open.openingCash || 0) : 0; }
  function cashIn() { return state.open ? Number(state.open.cashIn || 0) : 0; }
  function expectedCash() { return isOpen() ? openingCash() + cashIn() : 0; }

  function open(openingAmount, note) {
    const cashier = (window.EDY && EDY.me && (EDY.me.name || EDY.me.username)) || '\u2014';
    state.open = {
      openedAt: new Date().toISOString(),
      openingCash: Math.max(0, Number(openingAmount || 0)),
      note: (note || '').trim(),
      cashier,
      cashIn: 0
    };
    save(state);
    return state.open;
  }

  function addCashSale(amount) {
    if (!isOpen()) return false;
    state.open.cashIn = Number(state.open.cashIn || 0) + Number(amount || 0);
    save(state);
    return true;
  }

  function close(countedCash, note) {
    if (!isOpen()) return null;
    const session = {
      cashier: state.open.cashier,
      openedAt: state.open.openedAt,
      closedAt: new Date().toISOString(),
      openingCash: openingCash(),
      cashIn: cashIn(),
      expected: expectedCash(),
      counted: Math.max(0, Number(countedCash || 0)),
      difference: Math.max(0, Number(countedCash || 0)) - expectedCash(),
      note: (note || '').trim()
    };
    state.sessions.unshift(session);
    state.open = null;
    save(state);
    return session;
  }

  function sessions() { return state.sessions || []; }

  /* ---------- UI ---------- */
  let hostCb = { onOpened: null, onClosed: null };
  let openTracking = false;

  function openModalHTML() {
    return '<div class="modal fade" id="edyRegOpen" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">' +
      '<div class="modal-header"><h5 class="modal-title"><i class="bi bi-cash-coin me-2 text-green"></i>Open Cash Register</h5>' +
      '<button class="btn-close" data-bs-dismiss="modal"></button></div>' +
      '<div class="modal-body">' +
      '<p class="muted fs-13 mb-3">Enter the starting float in the drawer. You can start selling as soon as the register is opened.</p>' +
      '<label class="form-label">Opening Cash (OMR) *</label>' +
      '<div class="input-group mb-3"><span class="input-group-text">\u0631.\u0639.</span><input type="number" min="0" step="0.100" class="form-control" id="edRegOpenAmt" value="0" inputmode="decimal"></div>' +
      '<label class="form-label">Note</label><input class="form-control" id="edRegOpenNote" maxlength="120" placeholder="Optional note e.g. morning shift">' +
      '</div>' +
      '<div class="modal-footer"><button class="btn btn-ghost" data-bs-dismiss="modal">Cancel</button>' +
      '<button class="btn btn-success" id="edRegOpenSave"><i class="bi bi-check-lg me-1"></i>Open Register</button></div>' +
      '</div></div></div>';
  }
  function closeModalHTML() {
    return '<div class="modal fade" id="edyRegClose" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">' +
      '<div class="modal-header"><h5 class="modal-title"><i class="bi bi-cash-stack me-2 text-primary"></i>Close Register</h5>' +
      '<button class="btn-close" data-bs-dismiss="modal"></button></div>' +
      '<div class="modal-body" id="edRegCloseBody"></div>' +
      '<div class="modal-footer"><button class="btn btn-ghost" data-bs-dismiss="modal">Cancel</button>' +
      '<button class="btn btn-primary" id="edRegCloseSave"><i class="bi bi-check-lg me-1"></i>Close Register</button></div>' +
      '</div></div></div>';
  }
  function ensureModals() {
    if (!document.getElementById('edyRegOpen')) document.body.insertAdjacentHTML('beforeend', openModalHTML());
    if (!document.getElementById('edyRegClose')) document.body.insertAdjacentHTML('beforeend', closeModalHTML());
  }
  function money(v) { try { return EDY.fmt.money(v); } catch (e) { return EDY.fmt.amount(v); } }

  function bindOpenModal() {
    const save = document.getElementById('edRegOpenSave');
    if (!save || save.dataset.bound === '1') return;
    save.dataset.bound = '1';
    save.addEventListener('click', () => {
      const amt = Number(document.getElementById('edRegOpenAmt').value || 0);
      if (amt < 0) { EDY.ui.toast('Opening cash cannot be negative', 'warning'); return; }
      const note = document.getElementById('edRegOpenNote').value;
      open(amt, note);
      const m = bootstrap.Modal.getInstance(document.getElementById('edyRegOpen'));
      if (m) m.hide();
      document.querySelectorAll('.pos-register-gate').forEach(host => {
        const cb = host._edyOnOpened;
        host.remove();
        if (hostCb.onOpened) hostCb.onOpened();
      });
      EDY.ui.toast('Register opened with ' + money(amt), 'success');
    });
  }
  function bindCloseModal() {
    const save = document.getElementById('edRegCloseSave');
    if (!save || save.dataset.bound === '1') return;
    save.dataset.bound = '1';
    save.addEventListener('click', () => {
      const counted = Number(document.getElementById('edRegCounted').value || 0);
      const note = document.getElementById('edRegCloseNote').value;
      const s = close(counted, note);
      if (!s) return;
      const m = bootstrap.Modal.getInstance(document.getElementById('edyRegClose'));
      if (m) m.hide();
      document.querySelectorAll('.pos-register-chip').forEach(c => c.remove());
      if (gateHostEl) mountGate(gateHostEl);
      EDY.ui.toast('Register closed. Difference: ' + money(s.difference), s.difference === 0 ? 'success' : 'warning');
    });
  }

  /* gate screen shown while register is closed (blocks POS interaction) */
  let gateHostEl = null;
  function mountGate(host) {
    ensureModals(); bindOpenModal();
    gateHostEl = host;
    host.querySelectorAll('.pos-register-gate').forEach(n => n.remove());
    host.style.position = 'relative';
    const gate = document.createElement('div');
    gate.className = 'pos-register-gate';
    gate._host = host;
    gate.innerHTML =
      '<div class="card reg-gate-card">' +
      '<div class="card-body text-center p-4">' +
      '<div class="reg-gate-icon"><i class="bi bi-cash-coin"></i></div>' +
      '<h4 class="fw-bold mt-3 mb-1">Cash Register is Closed</h4>' +
      '<p class="muted fs-14 mb-4">Open a cash register to start a sale. Sales cannot be completed while the register is closed.</p>' +
      '<label class="form-label text-start d-block">Opening Cash in Drawer (OMR)</label>' +
      '<div class="input-group mb-3"><span class="input-group-text">\u0631.\u0639.</span>' +
      '<input type="number" min="0" step="0.100" class="form-control form-control-lg" id="edGateOpenAmt" value="0" inputmode="decimal"></div>' +
      '<label class="form-label text-start d-block">Note</label>' +
      '<input class="form-control mb-4" id="edGateOpenNote" maxlength="120" placeholder="Optional note e.g. morning shift">' +
      '<button class="btn btn-success btn-lg w-100" id="edGateOpenBtn"><i class="bi bi-cash-coin me-1"></i>Open Register</button>' +
      '</div></div>';
    host.appendChild(gate);

    const btn = document.getElementById('edGateOpenBtn');
    if (btn) btn.addEventListener('click', () => {
      const amt = Number(document.getElementById('edGateOpenAmt').value || 0);
      if (amt < 0) { EDY.ui.toast('Opening cash cannot be negative', 'warning'); return; }
      const note = document.getElementById('edGateOpenNote').value;
      open(amt, note);
      gate.remove();
      if (hostCb.onOpened) hostCb.onOpened();
      EDY.ui.toast('Register opened with ' + money(amt), 'success');
    });
  }

  /* status bar shown in the POS toolbar while the register is open */
  function mountChip(host) {
    ensureModals(); bindCloseModal();
    host.querySelectorAll('.pos-register-chip').forEach(n => n.remove());
    if (!isOpen()) return;
    const chip = document.createElement('div');
    chip.className = 'pos-register-chip';
    chip.innerHTML =
      '<div class="d-flex align-items-center flex-wrap gap-2">' +
      '<span class="badge bg-soft-green fs-13 px-3 py-2"><i class="bi bi-cash-coin me-1"></i>Register Open</span>' +
      '<span class="muted fs-13">Opening ' + money(openingCash()) + ' &middot; ' +
      (function () { try { return EDY.fmt.datetime(openedAt()); } catch (e) { return ''; } })() +
      ' &middot; Cash received: <span class="fw-bold text-dark">' + money(cashIn()) + '</span></span>' +
      '<button class="btn btn-soft-danger btn-sm ms-auto" data-close-register><i class="bi bi-x-lg me-1"></i>Close Register</button>' +
      '</div>';
    host.appendChild(chip);
    chip.querySelector('[data-close-register]').addEventListener('click', () => {
      if (!isOpen()) return;
      const openM = bootstrap.Modal.getOrCreateInstance(document.getElementById('edyRegClose'));
      document.getElementById('edRegCloseBody').innerHTML =
        '<div class="reg-close-summary">' +
        '<div class="d-flex justify-content-between py-1"><span class="muted">Opened</span><span class="fw-semibold">' + EDY.fmt.datetime(openedAt()) + '</span></div>' +
        '<div class="d-flex justify-content-between py-1"><span class="muted">Opening Cash</span><span class="fw-semibold">' + money(openingCash()) + '</span></div>' +
        '<div class="d-flex justify-content-between py-1"><span class="muted">Cash Sales (Received)</span><span class="fw-semibold text-green">' + money(cashIn()) + '</span></div>' +
        '<div class="d-flex justify-content-between py-1 border-top mt-2 pt-2 fs-15"><span class="fw-bold">Expected in Drawer</span><span class="fw-bold text-primary">' + money(expectedCash()) + '</span></div>' +
        '</div>' +
        '<hr>' +
        '<label class="form-label">Counted Cash in Drawer (OMR)</label>' +
        '<input type="number" min="0" step="0.001" class="form-control mb-3" id="edRegCounted" value="' + EDY.fmt.amount(expectedCash()) + '" inputmode="decimal">' +
        '<label class="form-label">Note</label><input class="form-control" id="edRegCloseNote" maxlength="120" placeholder="Optional note">';
      openM.show();
    });
  }

  /* entry point: mount the right UI into a host element */
  function mount(host, callbacks) {
    hostCb.onOpened = (callbacks && callbacks.onOpened) || null;
    hostCb.onClosed = (callbacks && callbacks.onClosed) || null;
    if (isOpen()) mountChip(host);
    else mountGate(host);
  }

  EDY.register = { getState, isOpen, openedAt, openingCash, cashIn, expectedCash, open, addCashSale, close, sessions, mount, mountGate, mountChip };
})();