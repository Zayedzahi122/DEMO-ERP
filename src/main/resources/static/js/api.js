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
  'money.symbolPlacement': 'BEFORE',
  'qty.scale': 2,
  'tax.vatRate': 0.05,
  'tax.mode': 'STANDARD',
  'tax.inclusive': false,
  'biz.timezone': 'Asia/Muscat',
  'biz.dateFormat': 'dd/MM/yyyy',
  'biz.timeFormat': '24',
  'maxScale': 6
};

EDY.fmt = (() => {
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /** Decimal places money is displayed with, as configured in Settings. */
  const scale = () => {
    const n = Number(EDY.settings['money.scale']);
    return Number.isFinite(n) ? Math.max(0, Math.min(6, n)) : 3;
  };

  const currency = () => EDY.settings['money.currency'] || 'OMR';

  /** Quantities are not money, so they get their own precision. */
  const qtyScale = () => {
    const n = Number(EDY.settings['qty.scale']);
    return Number.isFinite(n) ? Math.max(0, Math.min(6, n)) : 2;
  };

  const symbolPlacement = () =>
    (EDY.settings['money.symbolPlacement'] || 'BEFORE') === 'AFTER' ? 'AFTER' : 'BEFORE';

  const timezone = () => {
    const tz = EDY.settings['biz.timezone'] || 'Asia/Muscat';
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; }
    catch (e) { return undefined; }          // fall back to the browser's zone
  };

  const dateFormat = () => EDY.settings['biz.dateFormat'] || 'dd/MM/yyyy';
  const timeFormat = () => (EDY.settings['biz.timeFormat'] === '12') ? '12' : '24';

  /**
   * Breaks an instant into calendar fields as seen in the configured time zone.
   * Reading the fields through Intl (rather than off the local Date) is what makes
   * the time-zone setting actually change anything for a user in another country.
   */
  function parts(d, withTime) {
    const hour12 = timeFormat() === '12';
    const opts = {
      timeZone: timezone(), year: 'numeric', month: '2-digit', day: '2-digit'
    };
    if (withTime) {
      opts.hour = '2-digit'; opts.minute = '2-digit';
      opts.hour12 = hour12;
      opts.hourCycle = hour12 ? 'h12' : 'h23';
    }
    const out = {};
    new Intl.DateTimeFormat('en-US', opts).formatToParts(d).forEach(p => {
      if (p.type !== 'literal') out[p.type] = p.value;
    });
    return out;
  }

  /** Applies the chosen pattern by hand, so the output matches it exactly on
      every browser regardless of the user's locale data. */
  function shape(p, fmt) {
    const dd = p.day, MM = p.month, yyyy = p.year;
    switch (fmt) {
      case 'MM/dd/yyyy': return `${MM}/${dd}/${yyyy}`;
      case 'yyyy-MM-dd': return `${yyyy}-${MM}-${dd}`;
      case 'dd-MM-yyyy': return `${dd}-${MM}-${yyyy}`;
      case 'dd.MM.yyyy': return `${dd}.${MM}.${yyyy}`;
      case 'dd MMM yyyy': return `${dd} ${MONTHS_SHORT[Number(MM) - 1]} ${yyyy}`;
      case 'dd/MM/yyyy':
      default:           return `${dd}/${MM}/${yyyy}`;
    }
  }

  function clock(p) {
    if (!p.hour) return '';
    const ampm = p.dayPeriod ? ' ' + p.dayPeriod : '';
    return p.hour + ':' + p.minute + ampm;
  }

  return {
    scale, currency, qtyScale, symbolPlacement, timezone, dateFormat, timeFormat,

    money: (v) => {
      const d = scale();
      const s = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: d, maximumFractionDigits: d
      }).format(Number(v || 0));
      return symbolPlacement() === 'AFTER' ? s + ' ' + currency() : currency() + ' ' + s;
    },

    /** Same scale as money() but with no currency label - for inputs, CSV and charts. */
    amount: (v) => {
      const d = scale();
      return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    },

    /** Quantities, at the precision set in Settings. */
    qty: (v) => {
      const q = qtyScale();
      return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: q, maximumFractionDigits: q });
    },

    num: (v) => Number(v || 0).toLocaleString('en-US'),

    date: (s) => {
      if (!s) return '\u2014';
      const d = new Date(s);
      if (isNaN(d)) return s;
      return shape(parts(d, false), dateFormat());
    },

    datetime: (s) => {
      if (!s) return '\u2014';
      const d = new Date(s);
      if (isNaN(d)) return s;
      const p = parts(d, true);
      return shape(p, dateFormat()) + ' ' + clock(p);
    },

    initials: (name) => {
      if (!name) return '?';
      return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }
  };
})();

/* Tax, from the mode/rate/inclusive chosen in Settings > Money & Tax. Mirrors
   SettingsService.taxRate() and Totals.of(...) on the server, which is what
   actually persists the invoice totals - these are for live previews and labels.
   Keep the maths identical or the preview lies about what will be saved. */
EDY.vat = {
  /** The "Tax" drop-down: 'NONE' or 'STANDARD'. */
  mode: () => (EDY.settings['tax.mode'] === 'NONE' ? 'NONE' : 'STANDARD'),

  /** True when tax is switched on at all. */
  on: () => EDY.vat.mode() !== 'NONE',

  /** The configured rate as a fraction, e.g. 0.05, ignoring the mode. */
  configured: () => {
    const n = Number(EDY.settings['tax.vatRate']);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0.05;
  },

  /** The rate actually charged: zero while the drop-down is on "None". */
  rate: () => (EDY.vat.on() ? EDY.vat.configured() : 0),

  /** True when entered prices already contain the tax. */
  inclusive: () => EDY.settings['tax.inclusive'] === true
                  || EDY.settings['tax.inclusive'] === 'true',

  /** Tax as a whole percentage, ready to drop into a "VAT (5%)" label. */
  pct: () => (EDY.vat.rate() * 100).toLocaleString('en-US', { maximumFractionDigits: 4 }),

  /* Ready-made row label. Exclusive means the tax is added on top of the
     entered price; inclusive means it is already inside it, which is worth
     saying on the label so nobody reads the line as a surcharge. */
  label: (fallback = 'VAT') => {
    if (!EDY.vat.on()) return fallback;
    const pct = EDY.vat.pct() + '%';
    return EDY.vat.inclusive() ? fallback + ' (' + pct + ' included)' : fallback + ' (' + pct + ')';
  },

  /* Split a gross (already discounted) amount into tax and total, exactly as
     Totals.of(subtotal, discount, rate, scale, inclusive) does on the server.
     'gross' is subtotal minus discount. */
  split: (gross) => {
    const g = Number.isFinite(Number(gross)) ? Number(gross) : 0;
    const rate = EDY.vat.rate();
    if (rate <= 0) return { tax: 0, total: g };
    if (EDY.vat.inclusive()) return { tax: g - (g / (1 + rate)), total: g };
    return { tax: g * rate, total: g + (g * rate) };
  }
};

/* How long after its own date a transaction may still be edited
   (Settings > Operations > Transaction Edit Days). 0 switches editing off. */
EDY.editWindow = {
  days: () => {
    const n = Number(EDY.settings['biz.editDays']);
    return Number.isFinite(n) && n >= 0 ? n : 30;
  },
  /** @returns null when editing is allowed, otherwise the reason it is not. */
  blocked: (isoDate) => {
    const days = EDY.editWindow.days();
    if (days <= 0) return 'Editing is switched off (Transaction Edit Days is 0).';
    if (!isoDate) return null;
    const when = new Date(isoDate);
    if (isNaN(when)) return null;
    const age = Math.floor((Date.now() - when.getTime()) / 86400000);
    return age > days
      ? 'Only the last ' + days + ' days can be edited \u2014 this one is ' + age + ' days old.'
      : null;
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