/* EDY ERP — API client */
window.EDY = window.EDY || {};

EDY.api = (() => {
  async function request(method, url, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body !== undefined && body !== null) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (res.status === 401) {
      if (location.pathname !== '/login' && !location.pathname.endsWith('/login.html')) location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok || (data && data.status && data.status >= 400)) {
      const msg = data && data.message ? data.message : 'Request failed (' + res.status + ')';
      throw new Error(msg);
    }
    return data;
  }
  return {
    get: (u) => request('GET', u),
    post: (u, b) => request('POST', u, b),
    put: (u, b) => request('PUT', u, b),
    del: (u) => request('DELETE', u)
  };
})();

EDY.fmt = {
  money: (v) => {
    const n = Number(v || 0);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'OMR', minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);
  },
  num: (v) => Number(v || 0).toLocaleString('en-US'),
  date: (s) => {
    if (!s) return '\u2014';
    const d = new Date(s);
    if (isNaN(d)) return s;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  datetime: (s) => {
    if (!s) return '\u2014';
    const d = new Date(s);
    if (isNaN(d)) return s;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  },
  initials: (name) => {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
};

EDY.badge = {
  status: (s) => {
    const map = {
      CONFIRMED: ['bg-soft-green', 'Confirmed'],
      PAID: ['bg-soft-green', 'Paid'],
      UNPAID: ['bg-soft-amber', 'Unpaid'],
      CANCELLED: ['bg-soft-red', 'Cancelled'],
      DRAFT: ['bg-soft-gray', 'Draft'],
      PENDING: ['bg-soft-amber', 'Pending'],
      RECEIVED: ['bg-soft-blue', 'Received'],
      COMPLETED: ['bg-soft-green', 'Completed'],
      IN: ['bg-soft-green', 'Stock In'],
      OUT: ['bg-soft-red', 'Stock Out'],
      INCOME: ['bg-soft-green', 'Income'],
      EXPENSE: ['bg-soft-red', 'Expense']
    };
    const m = map[String(s).toUpperCase()] || ['bg-soft-gray', s || '\u2014'];
    return '<span class="badge ' + m[0] + '">' + m[1] + '</span>';
  },
  bool: (v, on = 'Active', off = 'Inactive') =>
    v ? '<span class="badge bg-soft-green">' + on + '</span>' : '<span class="badge bg-soft-gray">' + off + '</span>',
  colors: ['#2563eb', '#0d9488', '#7c3aed', '#d97706', '#dc2626', '#059669', '#0891b2', '#db2777']
};

EDY.avatar = (name, size = 36) =>
  '<span class="initials" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.38) + 'px">' + EDY.fmt.initials(name) + '</span>';