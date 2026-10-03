/* EDY ERP — API client */
window.EDY = window.EDY || {};

EDY.api = (() => {
  // CSRF token from the XSRF-TOKEN cookie (set by CookieCsrfTokenRepository with httpOnly=false).
  // Spring Security 7 expects it in the X-XSRF-TOKEN header on mutating requests.
  function csrfToken() {
    const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // Prime the CSRF cookie by calling the public /api/csrf endpoint.
  // Call this once on app load (layout.js does it) before any mutating request.
  let csrfPrimed = false;
  async function primeCsrf() {
    if (csrfPrimed) return;
    try {
      await fetch('/api/csrf', { credentials: 'same-origin' });
      csrfPrimed = true;
    } catch (e) {
      // Non-fatal; mutating requests will fail with 403 if token missing
      console.warn('CSRF priming failed:', e);
    }
  }

  async function request(method, url, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body !== undefined && body !== null) opts.body = JSON.stringify(body);
    // Attach CSRF token for mutating methods
    const mutating = /^(POST|PUT|PATCH|DELETE)$/i.test(method);
    if (mutating) {
      await primeCsrf(); // ensure cookie is set
      const token = csrfToken();
      if (token) opts.headers['X-XSRF-TOKEN'] = token;
    }
    const res = await fetch(url, opts);
    if (res.status === 401) {
      if (location.pathname !== '/login' && !location.pathname.endsWith('/login.html')) location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (res.status === 403) {
      throw new Error('You do not have permission to do that. Ask an Administrator.');
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
    del: (u) => request('DELETE', u),
    primeCsrf: () => primeCsrf()
  };
})();

/* Server-side settings, loaded once by layout.js before any page renders.
   Keys match ERP.Software.demo.setting.service.SettingsService. The defaults
   here are only a fallback for when the request fails. */
EDY.settings = {
  'money.scale': 3,
  'money.currency': 'OMR',
  'tax.vatRate': 0.05,
  'maxScale': 6
};

EDY.fmt = {
  /** Decimal places money is displayed with, as configured in Settings. */
  scale: () => {
    const n = Number(EDY.settings['money.scale']);
    return Number.isFinite(n) ? Math.max(0, Math.min(6, n)) : 3;
  },
  currency: () => EDY.settings['money.currency'] || 'OMR',
  money: (v) => {
    const d = EDY.fmt.scale();
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: EDY.fmt.currency(), minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(v || 0));
  },
  /** Same scale as money() but with no currency label - for inputs and charts. */
  amount: (v) => {
    const d = EDY.fmt.scale();
    return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
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

/* VAT, from the rate configured in Settings. Mirrors
   SettingsService.vatRate() on the server, which is what actually
   persists the invoice totals - these are for live previews and labels. */
EDY.vat = {
  /** Tax as a fraction, e.g. 0.05. */
  rate: () => {
    const n = Number(EDY.settings['tax.vatRate']);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0.05;
  },
  /** Tax as a whole percentage, ready to drop into a "VAT (5%)" label. */
  pct: () => (EDY.vat.rate() * 100).toLocaleString('en-US', { maximumFractionDigits: 4 })
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