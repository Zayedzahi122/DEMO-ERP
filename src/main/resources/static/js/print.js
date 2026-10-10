/* EDY ERP — print preview and printable documents.
 *
 * Everything the app can print goes through here, so there is one way to do it:
 * build a document, show it as a preview, and let the reader press Print.
 *
 * Why a preview rather than printing straight away: printing is a physical act that
 * cannot be undone, and a receipt, an A4 invoice and a page of tables are very
 * different pieces of paper. Showing the document first means the format is a choice
 * made with the page in front of you instead of a surprise coming out of the printer.
 *
 * Two kinds of document are produced:
 *   - generated ones (invoice, record, list) written against the `.pr-*` classes in
 *     SHEET, so they cannot be restyled by accident;
 *   - cloned ones (a section, or the whole page) which keep the app's own markup and
 *     are printed with the app's own stylesheets, so they look on paper as they do
 *     on screen.
 * SHEET is shared by the preview and the print output so what you see is what prints.
 *
 * SHEET has no `html`/`body`/bare `*` selectors: it is injected into the running app
 * when the preview opens, and those rules would restyle the page behind it. The base
 * rules hang off `.pr-page`, which the print frame's <body> and the preview's wrapper
 * both carry. */
window.EDY = window.EDY || {};

EDY.print = (function () {
  'use strict';

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  /** Delegates to the shared formatter so printed money matches every screen. */
  function money(n) {
    return (window.EDY && EDY.fmt && EDY.fmt.money) ? EDY.fmt.money(n) : String(n);
  }

  function setting(key, fallback) {
    return (window.EDY && EDY.settings && EDY.settings[key] != null)
      ? EDY.settings[key] : (fallback == null ? '' : fallback);
  }

  /** Dates on paper go through the shared formatter, never raw ISO text. */
  function fmtDate(s) {
    if (!s) return '';
    return (window.EDY && EDY.fmt && EDY.fmt.date) ? EDY.fmt.date(s) : String(s);
  }

  /* ------------------------------------------------------------------ *
   * Invoice language (English / Arabic / both) and design presets.
   * The chosen format and language come from Settings → Invoice & Design.
   * ------------------------------------------------------------------ */

  /** The ten design presets, in the order the settings drop-down shows them. */
  const FORMAT_IDS = ['classic', 'modern', 'minimal', 'bold', 'elegant',
    'corporate', 'vivid', 'warm', 'compact', 'blueprint'];

  /** Currency codes → their Arabic symbols, used when an invoice prints in Arabic. */
  const AR_CURRENCY = { OMR: '\u0631.\u0639', SAR: '\u0631.\u0633', AED: '\u062f.\u0625', USD: '$' };

  /** English and Arabic for every label a printed document can carry. */
  const TXT = {
    'Sales Invoice': { en: 'Sales Invoice', ar: '\u0641\u0627\u062a\u0648\u0631\u0629 \u0645\u0628\u064a\u0639\u0627\u062a' },
    'Purchase Invoice': { en: 'Purchase Invoice', ar: '\u0641\u0627\u062a\u0648\u0631\u0629 \u0645\u0634\u062a\u0631\u064a\u0627\u062a' },
    'Quotation': { en: 'Quotation', ar: '\u0639\u0631\u0636 \u0633\u0639\u0631' },
    'CANCELLED': { en: 'CANCELLED', ar: '\u0645\u0644\u063a\u064a' },
    'Customer': { en: 'Customer', ar: '\u0627\u0644\u0639\u0645\u064a\u0644' },
    'Supplier': { en: 'Supplier', ar: '\u0627\u0644\u0645\u0648\u0631\u062f' },
    'Document details': { en: 'Document details', ar: '\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0645\u0633\u062a\u0646\u062f' },
    'Date': { en: 'Date', ar: '\u0627\u0644\u062a\u0627\u0631\u064a\u062e' },
    'Valid until': { en: 'Valid until', ar: '\u0635\u0627\u0644\u062d \u062d\u062a\u0649' },
    'Payment': { en: 'Payment', ar: '\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639' },
    'Branch': { en: 'Branch', ar: '\u0627\u0644\u0641\u0631\u0639' },
    'Reference': { en: 'Reference', ar: '\u0627\u0644\u0645\u0631\u062c\u0639' },
    'Notes': { en: 'Notes', ar: '\u0645\u0644\u0627\u062d\u0638\u0627\u062a' },
    'VAT': { en: 'VAT', ar: '\u0627\u0644\u0636\u0631\u064a\u0628\u0629' },
    'Prepared by': { en: 'Prepared by', ar: '\u0623\u064f\u0639\u0651\u062f \u0628\u0648\u0627\u0633\u0637\u0629' },
    'signature': { en: 'signature', ar: '\u0627\u0644\u062a\u0648\u0642\u064a\u0639' },
    'Item': { en: 'Item', ar: '\u0627\u0644\u0635\u0646\u0641' },
    'Qty': { en: 'Qty', ar: '\u0627\u0644\u0643\u0645\u064a\u0629' },
    'Price': { en: 'Price', ar: '\u0627\u0644\u0633\u0639\u0631' },
    'Amount': { en: 'Amount', ar: '\u0627\u0644\u0645\u0628\u0644\u063a' },
    'Subtotal': { en: 'Subtotal', ar: '\u0627\u0644\u0645\u062c\u0645\u0648\u0639 \u0627\u0644\u0641\u0631\u0639\u064a' },
    'Discount': { en: 'Discount', ar: '\u0627\u0644\u062e\u0635\u0645' },
    'Total': { en: 'Total', ar: '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a' },
    'Paid': { en: 'Paid', ar: '\u0645\u062f\u0641\u0648\u0639' },
    'Balance due': { en: 'Balance due', ar: '\u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u0633\u062a\u062d\u0642' },
    'Location': { en: 'Location', ar: '\u0627\u0644\u0645\u0648\u0642\u0639' },
    'Generated': { en: 'Generated', ar: '\u062a\u0645 \u0627\u0644\u0625\u0646\u0634\u0627\u0621' }
  };

  /** The label mode for the document being built, set by invoice() each call. */
  let invLang = 'en';

  function resolvedLang() {
    const v = setting('biz.invoiceLang', 'en');
    return (v === 'ar' || v === 'both') ? v : 'en';
  }

  /** The design preset for the document being built. */
  function resolvedFormat() {
    const v = setting('biz.invoiceFormat', 'classic');
    return FORMAT_IDS.indexOf(v) === -1 ? 'classic' : v;
  }

  /**
   * A label in the current invoice language. 'both' stacks the Arabic under the
   * English; 'ar' returns Arabic alone. Labels come from TXT, never from user data,
   * so they are safe to trust as markup.
   */
  function L(key) {
    const t = TXT[key];
    if (!t) return key;
    if (invLang === 'ar') return t.ar || t.en;
    if (invLang === 'both' && t.ar && t.ar !== t.en) {
      return t.en + '<span class="pr-ar">' + t.ar + '</span>';
    }
    return t.en;
  }

  /** The currency code in Arabic, or the code unchanged when there is no symbol. */
  function currencyAr() {
    const c = String(setting('money.currency', '') || '').toUpperCase();
    return AR_CURRENCY[c] || c;
  }

  /** Money as the shared formatter prints it, with the Arabic currency symbol. */
  function moneyL(n) {
    const v = money(n);
    if (invLang !== 'ar') return v;
    const c = String(setting('money.currency', '') || '').toUpperCase();
    const s = AR_CURRENCY[c];
    if (!s || !c) return v;
    return v.replace(new RegExp('\\b' + c + '\\b'), s);
  }

  /* ------------------------------------------------------------------ *
   * The stylesheet. Used by the preview and written into the print frame.
   * ------------------------------------------------------------------ */
  const SHEET = `
.pr-page { margin: 0; padding: 0; background: #fff; color: #0f172a;
  font-family: Arial, "Helvetica Neue", Helvetica, sans-serif; font-size: 12.5px; line-height: 1.45;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pr-page *, .pr-page *::before, .pr-page *::after { box-sizing: border-box; }

.pr-doc { color: #0f172a; }
.pr-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding-bottom: 12px; border-bottom: 2px solid #0f172a; }
.pr-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
.pr-logo { width: 54px; height: 54px; object-fit: contain; }
.pr-biz { min-width: 0; }
.pr-biz-name { font-size: 18px; font-weight: 800; letter-spacing: .2px; }
.pr-biz-line { font-size: 11.5px; color: #475569; }
.pr-who { text-align: right; font-size: 11.5px; color: #475569; }
.pr-doc-title { font-size: 24px; font-weight: 800; letter-spacing: .6px; text-transform: uppercase; }
.pr-doc-no { font-size: 13px; font-weight: 700; }

.pr-parties { display: flex; gap: 24px; margin-top: 14px; }
.pr-party { flex: 1; }
.pr-label { font-size: 9.5px; letter-spacing: .9px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 3px; }
.pr-party-name { font-weight: 700; font-size: 13px; }
.pr-party-line { color: #475569; font-size: 11.5px; }

table.pr-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
.pr-table th { text-align: left; font-size: 9.5px; letter-spacing: .7px; text-transform: uppercase; color: #475569; padding: 7px 8px; border-bottom: 1.5px solid #0f172a; }
.pr-table td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
.pr-table tbody tr:nth-child(even) td { background: #f8fafc; }
/* A row torn across two pages is unreadable; keep each row on one page. */
.pr-table tr { break-inside: avoid; page-break-inside: avoid; }
.pr-table .n { text-align: right; white-space: nowrap; }
.pr-table .c { text-align: center; }
.pr-table .sku { color: #64748b; font-size: 10.5px; }

.pr-sums { display: flex; margin-top: 16px; break-inside: avoid; page-break-inside: avoid; }
.pr-sums-grow { flex: 1; }
.pr-totals { width: 260px; }
.pr-tot { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; }
.pr-tot span:first-child { color: #475569; }
.pr-tot.grand { border-top: 2px solid #0f172a; margin-top: 5px; padding-top: 9px; font-size: 15.5px; font-weight: 800; }
.pr-tot.grand span:first-child { color: #0f172a; }
.pr-paid { color: #059669; }
.pr-due { color: #dc2626; }

.pr-kv { display: grid; grid-template-columns: 150px 1fr; gap: 4px 14px; font-size: 12px; margin-top: 4px; }
.pr-kv dt { color: #64748b; }
.pr-kv dd { margin: 0; font-weight: 600; word-break: break-word; }

.pr-notes { margin-top: 14px; font-size: 11.5px; color: #475569; }
.pr-foot { margin-top: 22px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 10.5px; color: #64748b; text-align: center; }
.pr-sign { display: flex; gap: 40px; margin-top: 34px; }
.pr-sign div { flex: 1; border-top: 1px solid #0f172a; padding-top: 5px; font-size: 10.5px; color: #64748b; text-align: center; }

.pr-wm { text-align: center; font-size: 22px; font-weight: 800; letter-spacing: 4px; color: #dc2626; border: 2.5px solid #dc2626; padding: 7px 0; margin-bottom: 14px; }

/* --- receipt (80mm) --- */
.pr-receipt { width: 76mm; font-size: 11.5px; color: #000; }
.pr-receipt .pr-head { display: block; text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; }
.pr-receipt .pr-brand { display: block; text-align: center; }
.pr-receipt .pr-biz { text-align: center; }
.pr-receipt .pr-logo { width: 46px; height: 46px; margin: 0 auto 6px; display: block; }
.pr-receipt .pr-doc-title { font-size: 14px; }
.pr-receipt .pr-parties { display: block; margin-top: 8px; }
.pr-receipt .pr-meta { width: 100%; margin-top: 8px; font-size: 11px; }
.pr-receipt .pr-meta td { padding: 2px 0; border: none; }
.pr-receipt .pr-meta .k { color: #475569; }
.pr-receipt .pr-meta .v { text-align: right; font-weight: 700; }
.pr-receipt table.pr-table { margin-top: 8px; }
.pr-receipt .pr-table th { border-bottom: 1px dashed #000; padding: 4px 2px; font-size: 9.5px; }
.pr-receipt .pr-table td { padding: 3px 2px; border-bottom: 1px dashed #ddd; }
.pr-receipt .pr-table tbody tr:nth-child(even) td { background: transparent; }
.pr-receipt .pr-table .sku { font-size: 9.5px; }
/* Receipt line items: the product name takes the full width, with the quantity and
   rate underneath; only the amount sits in its own right-aligned column. */
.pr-receipt .pr-li-name { display: block; font-weight: 600; }
.pr-receipt .pr-li-sku { display: block; color: #64748b; font-size: 9.5px; }
.pr-receipt .pr-li-rate { display: block; color: #475569; font-size: 10px; margin-top: 2px; }
.pr-receipt .pr-sums { display: block; margin-top: 8px; border-top: 1px dashed #000; padding-top: 6px; }
.pr-receipt .pr-totals { width: 100%; }
.pr-receipt .pr-tot.grand { font-size: 14px; }
.pr-receipt .pr-foot { border-top: 1px dashed #000; }
.pr-receipt .pr-sign { display: none; }

/* --- invoice design presets (Settings → Invoice & Design) --------------------
   Each is a small override set on the document. They follow the paper layout
   rules above, so a preset changes the design, not the paper size. */

/* Modern — one quiet rule, centred brand, airy table. */
.pr-doc.pf-modern .pr-head { border-bottom: 1px solid #cbd5e1; justify-content: center; }
.pr-doc.pf-modern .pr-brand { text-align: center; }
.pr-doc.pf-modern .pr-who { text-align: left; }
.pr-doc.pf-modern .pr-doc-title { font-size: 20px; letter-spacing: 1.2px; }
.pr-doc.pf-modern table.pr-table { margin-top: 20px; }
.pr-doc.pf-modern .pr-table th { border-bottom: 1px solid #94a3b8; color: #64748b; }
.pr-doc.pf-modern .pr-tot.grand { border-top: 1px solid #94a3b8; }

/* Minimal — black on white, no fills, hairline rules. */
.pr-doc.pf-minimal { color: #111; }
.pr-doc.pf-minimal .pr-table tbody tr:nth-child(even) td,
.pr-doc.pf-minimal .pr-table tbody tr:nth-child(odd) td { background: transparent; }
.pr-doc.pf-minimal .pr-table td { border-bottom: 1px solid #cbd5e1; }
.pr-doc.pf-minimal .pr-table th,
.pr-doc.pf-minimal .pr-tot span:first-child { color: #334155; }
.pr-doc.pf-minimal .pr-doc-title { font-size: 21px; }

/* Bold — heavy rules and ink, for a firm, unmistakable document. */
.pr-doc.pf-bold .pr-head { border-bottom-width: 3px; }
.pr-doc.pf-bold .pr-doc-title { letter-spacing: 1px; }
.pr-doc.pf-bold .pr-table th { border-bottom: 2px solid #0f172a; }
.pr-doc.pf-bold .pr-table td { border-bottom: 1px solid #94a3b8; }
.pr-doc.pf-bold .pr-tot.grand { border-top-width: 3px; }
.pr-doc.pf-bold .pr-label { letter-spacing: 1.3px; }
.pr-doc.pf-bold .pr-wm { letter-spacing: 5px; }

/* Elegant — serif titles and fine rules. */
.pr-doc.pf-elegant .pr-doc-title,
.pr-doc.pf-elegant .pr-biz-name,
.pr-doc.pf-elegant th, .pr-doc.pf-elegant td {
  font-family: Georgia, "Times New Roman", serif; }
.pr-doc.pf-elegant .pr-doc-title { font-weight: 700; }
.pr-doc.pf-elegant .pr-head { border-bottom: 1px solid #0f172a; }
.pr-doc.pf-elegant .pr-table th { border-bottom: 1px solid #0f172a; letter-spacing: .5px; }
.pr-doc.pf-elegant .pr-tot.grand { border-top: 1px solid #0f172a; }

/* Corporate — a tinted brand band, boxed totals, structured columns. */
.pr-doc.pf-corporate .pr-head { border-bottom: none; background: #eef2f6; padding: 14px 16px; }
.pr-doc.pf-corporate .pr-doc-title { font-size: 20px; }
.pr-doc.pf-corporate .pr-table th { background: #eef2f6; border-bottom: 2px solid #0f172a; }
.pr-doc.pf-corporate .pr-totals { border: 1px solid #0f172a; padding: 10px 12px; background: #f8fafc; }
.pr-doc.pf-corporate .pr-tot.grand { border-top: 1px solid #0f172a; }
.pr-doc.pf-corporate .pr-sign div { border-top-width: 2px; }

/* Vivid — a blue title and a filled blue header row. */
.pr-doc.pf-vivid .pr-doc-title { color: #2563eb; }
.pr-doc.pf-vivid .pr-table th { color: #fff; background: #2563eb; border-bottom: none; }
.pr-doc.pf-vivid .pr-table tbody tr:nth-child(even) td { background: #eff6ff; }
.pr-doc.pf-vivid .pr-tot.grand { border-top: 2px solid #2563eb; }
.pr-doc.pf-vivid .pr-tot.grand span:first-child { color: #2563eb; }

/* Warm — an amber title and a filled amber header row. */
.pr-doc.pf-warm .pr-doc-title { color: #b45309; }
.pr-doc.pf-warm .pr-table th { color: #fff; background: #d97706; border-bottom: none; }
.pr-doc.pf-warm .pr-table tbody tr:nth-child(even) td { background: #fffbeb; }
.pr-doc.pf-warm .pr-tot.grand { border-top: 2px solid #d97706; }
.pr-doc.pf-warm .pr-tot.grand span:first-child { color: #d97706; }

/* Compact — denser type, more lines per page. */
.pr-doc.pf-compact { font-size: 12px; }
.pr-doc.pf-compact .pr-doc-title { font-size: 19px; }
.pr-doc.pf-compact table.pr-table { margin-top: 10px; font-size: 11.5px; }
.pr-doc.pf-compact .pr-table th, .pr-doc.pf-compact .pr-table td { padding: 4px 6px; }
.pr-doc.pf-compact .pr-parties { margin-top: 10px; }
.pr-doc.pf-compact .pr-sums { margin-top: 10px; }
.pr-doc.pf-compact .pr-sign { margin-top: 20px; }

/* Blueprint — monospaced, technical, double-ruled. */
.pr-doc.pf-blueprint .pr-head { border-bottom: 3px double #0f172a; }
.pr-doc.pf-blueprint .pr-doc-title,
.pr-doc.pf-blueprint th, .pr-doc.pf-blueprint td {
  font-family: "Courier New", monospace; }
.pr-doc.pf-blueprint .pr-doc-title { letter-spacing: 1.5px; }
.pr-doc.pf-blueprint .pr-table th { border-bottom: 2px solid #0f172a; }
.pr-doc.pf-blueprint .pr-table td { border-bottom: 1px solid #0f172a; }
.pr-doc.pf-blueprint .pr-tot.grand { border-top: 2px solid #0f172a; }
.pr-doc.pf-blueprint .pr-label { letter-spacing: 1.5px; }

/* --- Arabic in documents ------------------------------------------------
   In a bilingual document the Arabic is the second line of a label; in a fully
   Arabic document the sheet turns right-to-left and the numeric columns follow. */
.pr-ar { display: block; direction: rtl; unicode-bidi: isolate; font-size: .82em; font-weight: 600; }
.pr-doc-ar { direction: rtl; }
.pr-doc-ar .n, .pr-doc-ar .pr-who, .pr-doc-ar .pr-meta .v { text-align: left; }
.pr-doc-ar .pr-brand, .pr-doc-ar .pr-biz, .pr-doc-ar .pr-receipt .pr-head { text-align: right; }

/* --- the cloned app content --- */
.app-print { font-size: 12.5px; color: #0f172a; }
.app-print .page-title { font-size: 20px; font-weight: 800; }
.app-print .page-sub { color: #64748b; font-size: 12px; margin-bottom: 4px; }
.app-print .card { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 14px; break-inside: avoid; }
.app-print .card-header { font-weight: 700; padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
.app-print .card-body { padding: 12px; }
/* Fields that were controls: their value, set in place of the control. */
.pr-field-value { font-weight: 600; word-break: break-word; }
.app-print .table { width: 100%; border-collapse: collapse; font-size: 12px; }
.app-print .table th, .app-print .table td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
.app-print .table th { font-size: 9.5px; text-transform: uppercase; letter-spacing: .6px; color: #64748b; }
.app-print .badge { display: inline-block; padding: 2px 7px; border-radius: 5px; font-size: 10.5px; font-weight: 700; border: 1px solid currentColor; }
.app-print img { max-width: 100%; }
.app-print canvas { display: none; }            /* replaced by its image, or omitted */
.app-print .pr-chart { display: block; max-width: 100%; height: auto; }
.app-print .muted { color: #64748b; }
.app-print .fs-11 { font-size: 11px; } .app-print .fs-12 { font-size: 12px; } .app-print .fs-13 { font-size: 13px; } .app-print .fs-16 { font-size: 16px; }
.app-print .fw-bold, .app-print .fw-800 { font-weight: 800; } .app-print .fw-semibold { font-weight: 600; }
.app-print .text-end { text-align: right; } .app-print .text-right { text-align: right; } .app-print .text-center { text-align: center; }
.app-print .text-red, .app-print .text-danger { color: #dc2626; }
.app-print .text-green { color: #059669; }
.app-print .text-amber { color: #d97706; }
.app-print .text-primary { color: #2563eb; }
.app-print .stat-card { border: 1px solid #e2e8f0; border-radius: 8px; break-inside: avoid; }
.app-print .row { display: block; }
.app-print [class*="col-"] { display: block; width: 100%; margin-bottom: 12px; }

/* On screen only: the paper edge. Scoped to the overlay so the print frame never
   tries to put a drop shadow on paper. */
.pr-preview .pr-doc, .pr-preview .app-print { background: #fff; box-shadow: 0 2px 18px rgba(15,23,42,.16); }

/* Strong ink on paper. Light greys and hairline borders read fine on a screen but
   go faint when printed, so when the sheet reaches a printer every text colour is
   pushed to black, the borders and the alternating row bands are darkened, and the
   figures that carry the most weight are set bold. The preview keeps its softer
   palette because these rules only exist inside @media print. */
@media print {
  .pr-page, .pr-page * { color: #000 !important; }
  .pr-page .pr-paid, .pr-page .pr-paid * { color: #047857 !important; }
  .pr-page .pr-due, .pr-page .pr-due * { color: #b91c1c !important; }
  .pr-page .pr-wm, .pr-page .pr-wm * { color: #b91c1c !important; border-color: #b91c1c !important; }
  /* The filled-header presets keep their white header text on paper. */
  .pr-page .pf-vivid .pr-table th, .pr-page .pf-warm .pr-table th { color: #fff !important; }
  .pr-page .pr-head, .pr-page .pr-tot.grand, .pr-page .pr-sign div,
  .pr-page .pr-foot, .pr-page .pr-sums { border-color: #000 !important; }
  .pr-page thead th { border-bottom-color: #000 !important; }
  .pr-page tbody td { border-bottom-color: #555 !important; }
  .pr-page tbody tr:nth-child(even) td { background: #efefef !important; }
  .pr-page .pr-table td.n, .pr-page .pr-tot span:last-child { font-weight: 700; }
  /* A logo that is light or transparent washes out on paper; push its contrast so
     the mark reads, while the on-screen preview is unchanged. */
  .pr-page .pr-logo { filter: contrast(1.25) saturate(1.2) brightness(1.02); }
}
`;

  /** Stylesheets the cloned (app) content needs, in document order. */
  function appStyleLinks() {
    const seen = [];
    const links = [];
    const ours = [];
    try {
      Array.prototype.forEach.call(document.querySelectorAll('link[rel="stylesheet"]'), l => {
        const href = l.getAttribute('href');
        if (!href || seen.indexOf(href) !== -1) return;
        seen.push(href);
        // The app's own sheet carries no print overrides for the frame, and the CDN
        // must come first so SHEET still wins.
        if (href.indexOf('/css/') === 0) ours.push(href); else links.push(href);
      });
    } catch (e) { /* the app's own sheet below is the important one */ }
    // CDN first, the app's sheet last so its rules win, and SHEET last of all.
    return links.concat(ours).map(h => '<link rel="stylesheet" href="' + esc(h) + '">').join('');
  }

  /* ------------------------------------------------------------------ *
   * Generated documents
   * ------------------------------------------------------------------ */

  /**
   * Business identity as it appears at the head of every printed document.
   * lang is the current invoice document language: on Arabic and bilingual
   * documents the local (Arabic) company name from Settings is shown too.
   */
  function brandBlock(lang) {
    const logo = setting('biz.logo', '');
    // No invented fallback. A document that names the wrong company is worse than
    // one whose header is sparse — every business has its name written once in
    // Settings, and this reads from there.
    const name = setting('biz.name', '');
    const local = setting('biz.nameLocal', '');
    const ar = lang === 'ar' || lang === 'both';
    const lines = [setting('biz.address', ''), setting('biz.phone', ''), setting('biz.vatNo', '') ? 'VAT ' + setting('biz.vatNo') : ''];
    let bizName = '';
    if (lang === 'ar') {
      bizName = (local || name) ? '<div class="pr-biz-name">' + esc(local || name) + '</div>' : '';
      if (local && name && name !== local) bizName += '<div class="pr-biz-line" dir="ltr">' + esc(name) + '</div>';
    } else {
      bizName = name ? '<div class="pr-biz-name">' + esc(name) + '</div>' : '';
      if (ar && local && local !== name) bizName += '<div class="pr-biz-line pr-ar">' + esc(local) + '</div>';
    }
    return '<div class="pr-brand">' +
      (logo ? '<img class="pr-logo" src="' + esc(logo) + '" alt="">' : '') +
      '<div class="pr-biz">' +
        bizName +
        lines.filter(Boolean).map(l => '<div class="pr-biz-line">' + esc(l) + '</div>').join('') +
      '</div>' +
    '</div>';
  }

  function docHead(title, number, rightLines, lang, rawTitle) {
    return '<div class="pr-head">' +
      brandBlock(lang || 'en') +
      '<div class="pr-who">' +
        '<div class="pr-doc-title">' + (rawTitle ? title : esc(title)) + '</div>' +
        (number ? '<div class="pr-doc-no">' + esc(number) + '</div>' : '') +
        (rightLines || []).map(l => '<div>' + esc(l) + '</div>').join('') +
      '</div>' +
    '</div>';
  }

  /**
   * The closing line of a document: the receipt/invoice footers and the
   * generated timestamp, in the document's language. Invoice documents also
   * carry the custom invoice footer set in Settings → Invoice & Design.
   */
  function footLine(lang, forInvoice) {
    lang = lang || 'en';
    const header = setting('receipt.header', '');
    const footer = setting('receipt.footer', '');
    const invFoot = forInvoice ? setting('invoice.footer', '') : '';
    const stamp = new Date().toLocaleString();
    let generated;
    if (lang === 'ar') generated = '\u062a\u0645 \u0627\u0644\u0625\u0646\u0634\u0627\u0621 \u0641\u064a ' + stamp;
    else if (lang === 'both') {
      generated = 'Generated ' + stamp +
        '<span class="pr-ar">\u062a\u0645 \u0627\u0644\u0625\u0646\u0634\u0627\u0621 \u0641\u064a ' + stamp + '</span>';
    } else {
      generated = 'Generated ' + stamp;
    }
    return '<div class="pr-foot">' +
      (header ? esc(header) + '<br>' : '') +
      (footer ? esc(footer) + '<br>' : '') +
      (invFoot ? esc(invFoot) + '<br>' : '') +
      generated +
    '</div>';
  }

  /**
   * A sales invoice, purchase invoice or quotation.
   *
   * opts: { type: 'sale'|'purchase'|'quotation', format: 'a4'|'receipt' }
   */
  function invoice(inv, opts) {
    opts = opts || {};
    const type = opts.type || 'sale';
    const receipt = opts.format === 'receipt';
    // The chosen design preset and label language for this document, read once per
    // build so a settings change shows up the next time the preview is opened.
    invLang = resolvedLang();
    const fmt = resolvedFormat();

    const items = Array.isArray(inv.items) ? inv.items : [];
    const subtotal = Number(inv.subtotal) || items.reduce((s, it) =>
      s + Number(it.unitPrice || it.unitCost || 0) * Number(it.quantity || 0), 0);
    const discount = Number(inv.discount || 0);
    const vat = Number(inv.taxAmount || 0);
    const total = Number(inv.totalAmount != null ? inv.totalAmount : subtotal - discount + vat);
    const paid = Number(inv.amountPaid || 0);
    const due = Number(inv.balanceDue || 0);
    const cancelled = inv.status === 'CANCELLED';

    const party = type === 'purchase' ? inv.supplier : (inv.customer || null);
    const partyName = party ? party.name : (inv.customerName || inv.walkinName || 'Walk-in Customer');
    const roleLabel = L(type === 'purchase' ? 'Supplier' : 'Customer');

    const isQuo = type === 'quotation';
    const title = L(isQuo ? 'Quotation' : type === 'purchase' ? 'Purchase Invoice' : 'Sales Invoice');
    const number = inv.invoiceNumber || inv.quotationNumber ||
      (type === 'purchase' ? 'PO-' : isQuo ? 'QUO-' : 'INV-') + String(inv.id || '').padStart(4, '0');
    const date = inv.invoiceDate || inv.quotationDate || inv.date || '';

    const payLabel = (inv.paymentMethod || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // ---- items ----
    // Two quite different tables, because A4 and an 80mm roll are different paper.
    // A4 keeps the five-column grid: a wide Item column beside fixed numeric ones.
    // An 80mm receipt cannot fit # · Item · Qty · Price · Amount side by side —
    // squeezing the A4 widths into 74mm leaves the product name a few dozen pixels
    // wide and turns every line into a tall, ragged block — so the receipt uses a
    // two-column list: the product on a line of its own (name, then qty × rate
    // beneath), with the amount right-aligned. Names keep the full paper width.
    const itemRow = (it, i) => {
      const name = (it.product && it.product.name) || it.productName || (it.sku ? '' : 'Product #' + it.productId);
      const sku = (it.product && it.product.sku) || it.sku || '';
      const qty = String(it.quantity);
      const price = Number(it.unitPrice != null ? it.unitPrice : (it.unitCost || 0));
      const lineTotal = Number(it.lineTotal != null ? it.lineTotal : price * Number(it.quantity || 0));
      return {
        name: name, sku: sku, qty: qty, price: price, lineTotal: lineTotal
      };
    };

    const tableHtml =
      '<table class="pr-table">' +
        '<thead><tr><th style="width:34px">#</th><th>' + L('Item') + '</th>' +
        '<th class="n" style="width:70px">' + L('Qty') + '</th>' +
        '<th class="n" style="width:110px">' + L('Price') + '</th>' +
        '<th class="n" style="width:120px">' + L('Amount') + '</th></tr></thead>' +
        '<tbody>' + items.map((it, i) => {
          const r = itemRow(it, i);
          return '<tr>' +
            '<td class="n muted">' + (i + 1) + '</td>' +
            '<td>' + esc(r.name) + (r.sku ? '<div class="sku">' + esc(r.sku) + '</div>' : '') + '</td>' +
            '<td class="n">' + esc(r.qty) + '</td>' +
            '<td class="n">' + esc(moneyL(r.price)) + '</td>' +
            '<td class="n">' + esc(moneyL(r.lineTotal)) + '</td>' +
          '</tr>';
        }).join('') + '</tbody>' +
      '</table>';

    const receiptTableHtml =
      '<table class="pr-table">' +
        '<thead><tr><th>' + L('Item') + '</th><th class="n">' + L('Amount') + '</th></tr></thead>' +
        '<tbody>' + items.map((it, i) => {
          const r = itemRow(it, i);
          return '<tr>' +
            '<td>' +
              '<span class="pr-li-name">' + esc(r.name) + '</span>' +
              (r.sku ? '<span class="pr-li-sku">' + esc(r.sku) + '</span>' : '') +
              '<span class="pr-li-rate">' + esc(r.qty) + ' \u00d7 ' + esc(moneyL(r.price)) + '</span>' +
            '</td>' +
            '<td class="n">' + esc(moneyL(r.lineTotal)) + '</td>' +
          '</tr>';
        }).join('') + '</tbody>' +
      '</table>';

    // ---- totals ----
    const totalRows = [
      '<div class="pr-tot"><span>' + L('Subtotal') + '</span><span>' + esc(moneyL(subtotal)) + '</span></div>',
      discount > 0 ? '<div class="pr-tot"><span>' + L('Discount') + '</span><span>' + esc(moneyL(discount)) + '</span></div>' : '',
      vat > 0 ? '<div class="pr-tot"><span>' + L('VAT') + '</span><span>' + esc(moneyL(vat)) + '</span></div>' : '',
      '<div class="pr-tot grand"><span>' + L('Total') + '</span><span>' + esc(moneyL(total)) + '</span></div>',
      paid > 0 ? '<div class="pr-tot pr-paid"><span>' + L('Paid') + '</span><span>' + esc(moneyL(paid)) + '</span></div>' : '',
      due > 0.001 ? '<div class="pr-tot pr-due"><span>' + L('Balance due') + '</span><span>' + esc(moneyL(due)) + '</span></div>' : ''
    ].join('');

    const sums = '<div class="pr-sums"><div class="pr-sums-grow"></div><div class="pr-totals">' + totalRows + '</div></div>';

    const payments = (Array.isArray(inv.payments) && inv.payments.length)
      ? '<table class="pr-table" style="margin-top:14px"><thead><tr><th>' + L('Payment') + '</th><th class="n">' + L('Amount') + '</th></tr></thead><tbody>' +
        inv.payments.map(p => '<tr><td>' + esc(String(p.method || '').replace(/_/g, ' ')) +
          (p.paidAt ? ' <span class="sku">' + esc(fmtDate(p.paidAt)) + '</span>' : '') +
          '</td><td class="n">' + esc(moneyL(p.amount)) + '</td></tr>').join('') +
        '</tbody></table>'
      : '';

    const meta = [
      [L('Date'), fmtDate(date)],
      inv.validUntil ? [L('Valid until'), fmtDate(inv.validUntil)] : null,
      [L('Payment'), payLabel],
      inv.location ? [L('Location'), inv.location] : null,
      inv.branch ? [L('Branch'), inv.branch] : null,
      inv.reference ? [L('Reference'), inv.reference] : null,
      inv.notes ? [L('Notes'), inv.notes] : null
    ].filter(Boolean);

    if (receipt) {
      const metaHtml = '<table class="pr-meta">' + meta.map(m =>
        '<tr><td class="k">' + m[0] + '</td><td class="v">' + esc(String(m[1])) + '</td></tr>').join('') + '</table>';
      return '<div class="pr-doc pr-receipt pf-' + fmt + '"' + (invLang === 'ar' ? ' dir="rtl"' : '') + '>' +
        (cancelled ? '<div class="pr-wm">' + L('CANCELLED') + '</div>' : '') +
        '<div class="pr-head">' +
          brandBlock(invLang) +
          '<div class="pr-doc-title" style="margin-top:7px">' + (invLang === 'both' ? title : esc(title)) + '</div>' +
          '<div class="pr-doc-no">' + esc(number) + '</div>' +
        '</div>' +
        metaHtml +
        '<div class="pr-party" style="margin-top:8px">' +
          '<div class="pr-party-name">' + esc(partyName) + '</div>' +
          '<div class="pr-party-line">' + roleLabel + '</div>' +
        '</div>' +
        receiptTableHtml +
        sums +
        footLine(invLang, true) +
      '</div>';
    }

    return '<div class="pr-doc pf-' + fmt + '"' + (invLang === 'ar' ? ' dir="rtl"' : '') + '>' +
      (cancelled ? '<div class="pr-wm">' + L('CANCELLED') + '</div>' : '') +
      docHead(title, number, [fmtDate(date)], invLang, invLang === 'both') +
      '<div class="pr-parties">' +
        '<div class="pr-party">' +
          '<div class="pr-label">' + roleLabel + '</div>' +
          '<div class="pr-party-name">' + esc(partyName) + '</div>' +
          (party && party.phone ? '<div class="pr-party-line">' + esc(party.phone) + '</div>' : '') +
          (party && party.address ? '<div class="pr-party-line">' + esc(party.address) + '</div>' : '') +
          (party && party.vatNo ? '<div class="pr-party-line">VAT ' + esc(party.vatNo) + '</div>' : '') +
        '</div>' +
        '<div class="pr-party">' +
          '<div class="pr-label">' + L('Document details') + '</div>' +
          '<dl class="pr-kv">' +
            meta.map(m => '<dt>' + m[0] + '</dt><dd>' + esc(String(m[1])) + '</dd>').join('') +
          '</dl>' +
        '</div>' +
      '</div>' +
      tableHtml +
      payments +
      sums +
      '<div class="pr-sign"><div>' + L('Prepared by') + '</div><div>' + roleLabel + ' ' + L('signature') + '</div></div>' +
      footLine(invLang, true) +
    '</div>';
  }

  /**
   * A single record — a product, customer, supplier, employee, user, expense — as a
   * page of labelled fields. Used where there is no document to print, so the Print
   * action on those rows still produces something worth keeping.
   */
  function record(title, number, fields, opts) {
    opts = opts || {};
    const flat = (fields || []).filter(f => f && f[0] != null && f[0] !== '');
    return '<div class="pr-doc">' +
      docHead(title, number, opts.lines || []) +
      '<dl class="pr-kv" style="margin-top:16px">' +
        flat.map(f => '<dt>' + esc(f[0]) + '</dt><dd>' + esc(String(f[1])) + '</dd>').join('') +
      '</dl>' +
      (opts.body ? '<div class="pr-label" style="margin-top:20px">' + esc(opts.bodyLabel || 'Detail') + '</div>' + opts.body : '') +
      footLine() +
    '</div>';
  }

  /**
   * A table — a filtered list, a report, a section's data — as a document.
   * columns: [{ label, align: 'l'|'c'|'r' }]
   * rows:    [[cell, ...], ...]
   * opts.bare returns only the table and summary, so a list can be dropped inside a
   * record() without a second business header appearing under the first.
   */
  function list(title, columns, rows, opts) {
    opts = opts || {};
    const head = (columns || []).map(c =>
      '<th class="' + (c.align === 'r' ? 'n' : c.align === 'c' ? 'c' : '') + '"' +
      (c.width ? ' style="width:' + c.width + '"' : '') + '>' + esc(c.label) + '</th>').join('');
    const body = (rows || []).map(r =>
      '<tr>' + r.map((cell, i) => {
        const align = (columns[i] || {}).align;
        return '<td class="' + (align === 'r' ? 'n' : align === 'c' ? 'c' : '') + '">' + cell + '</td>';
      }).join('') + '</tr>').join('');
    const summary = (opts.summary || []).map(s =>
      '<div class="pr-tot' + (s.bold ? ' grand' : '') + '"><span>' + esc(s.label) + '</span><span>' + esc(s.value) + '</span></div>').join('');

    const table = '<table class="pr-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>';
    const sums = summary
      ? '<div class="pr-sums"><div class="pr-sums-grow"></div><div class="pr-totals">' + summary + '</div></div>'
      : '';

    if (opts.bare) return table + sums;

    return '<div class="pr-doc">' +
      docHead(title, opts.number || '', opts.lines || []) +
      table +
      sums +
      footLine() +
    '</div>';
  }

  /* ------------------------------------------------------------------ *
   * Cloned app content — a section, or the whole page
   * ------------------------------------------------------------------ */

  /** Draw a chart canvas onto a white background so it is not printed as nothing. */
  function canvasToImage(canvas) {
    try {
      const out = document.createElement('canvas');
      out.width = canvas.width; out.height = canvas.height;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(canvas, 0, 0);
      return out.toDataURL('image/png');
    } catch (e) {
      return null;
    }
  }

  /**
   * A copy of live page content, stripped of anything the reader could not act on
   * once it is on paper: controls, buttons, pagination, navigation and links that
   * only make sense in a browser. Charts are turned into images, because a canvas
   * prints blank and would look like the report had lost its data.
   */
  function cleaned(source) {
    if (!source) return '';
    const clone = source.cloneNode(true);

    const srcCanvases = source.querySelectorAll('canvas');
    const dstCanvases = clone.querySelectorAll('canvas');
    Array.prototype.forEach.call(dstCanvases, (c, i) => {
      const data = srcCanvases[i] ? canvasToImage(srcCanvases[i]) : null;
      if (data) {
        const img = document.createElement('img');
        img.className = 'pr-chart';
        img.src = data;
        c.parentNode.replaceChild(img, c);
      } else {
        c.parentNode.removeChild(c);
      }
    });

    /**
     * A control holds a value somebody typed or chose, and a printed page of labels
     * with nothing beside them would say very little — a settings sheet with no
     * settings on it. Each becomes its text, with an em dash where the field is
     * empty, so an unset value reads as unset rather than as missing.
     *
     * The exceptions are things that would leak or merely take up room: passwords,
     * file pickers, hidden inputs, and search boxes (their query describes a moment
     * of looking, not the business). Nothing here is inside a <form> — the settings
     * screen saves through a button, not a submit — so presence in a form cannot be
     * what decides.
     */
    function fieldText(el) {
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (type === 'checkbox' || type === 'radio') return el.checked ? 'Yes' : 'No';
      if (el.tagName === 'SELECT') {
        const opt = el.selectedOptions && el.selectedOptions[0];
        const t = opt ? (opt.textContent || '').trim() : '';
        return t || '\u2014';
      }
      const v = (el.value == null ? '' : String(el.value)).trim();
      return v || '\u2014';
    }

    Array.prototype.forEach.call(clone.querySelectorAll('input, select, textarea'), el => {
      const type = (el.getAttribute('type') || '').toLowerCase();
      const placeholder = el.getAttribute('placeholder') || '';
      const drop =
        type === 'hidden' || type === 'password' || type === 'search' || type === 'file' ||
        /search/i.test(placeholder) ||
        (el.closest && (el.closest('.topbar-search') || el.closest('.no-print')));
      if (drop) { if (el.parentNode) el.parentNode.removeChild(el); return; }
      if (!el.parentNode) return;
      const span = document.createElement('span');
      span.className = 'pr-field-value';
      span.textContent = fieldText(el);
      el.parentNode.replaceChild(span, el);
    });

    Array.prototype.forEach.call(clone.querySelectorAll(
      'button, script, style, .dropdown, .dropdown-menu, .pagination, .no-print, .pager, nav, .btn'
    ), n => n.parentNode && n.parentNode.removeChild(n));

    // Links keep their text — "View all" still reads as a label — but the link goes,
    // because nothing can be followed on paper.
    Array.prototype.forEach.call(clone.querySelectorAll('a[href]'), a => {
      const t = document.createTextNode(a.textContent || '');
      a.parentNode.replaceChild(t, a);
    });

    // Hidden content stays hidden: printing a collapsed panel's placeholder is noise.
    Array.prototype.forEach.call(clone.querySelectorAll('[hidden], .d-none, .collapse:not(.show)'), n =>
      n.parentNode && n.parentNode.removeChild(n));

    Array.prototype.forEach.call(clone.querySelectorAll('.spinner-border'), n =>
      n.parentNode && n.parentNode.removeChild(n));

    return clone.innerHTML;
  }

  /* ------------------------------------------------------------------ *
   * Printing
   * ------------------------------------------------------------------ */

  /**
   * Prints into a hidden frame rather than the page itself, so none of the app's
   * chrome — sidebar, topbar, banners, buttons — reaches the paper.
   *
   * The frame outlives print(): removing it while the dialog is open cancels the
   * job in Chrome, so it is dropped a minute later instead.
   */
  function printFrame(title, html, pageRule) {
    const frame = document.createElement('iframe');
    frame.className = 'pr-frame';
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('tabindex', '-1');
    frame.title = 'print';
    document.body.appendChild(frame);

    const doc = frame.contentDocument;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      appStyleLinks() +
      '<style>' + pageRule + '\n' + SHEET + '</style>' +
      '</head><body class="pr-page">' + html + '</body></html>');
    doc.close();

    let done = false;
    function go() {
      if (done) return;
      done = true;
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch (e) { /* the browser menu still works */ }
      setTimeout(() => frame.parentNode && frame.parentNode.removeChild(frame), 60000);
    }
    frame.addEventListener('load', () => setTimeout(go, 90));
    // Stylesheets from the CDN may never arrive; never hold the dialog hostage to them.
    setTimeout(go, 2500);
    return frame;
  }

  /* ------------------------------------------------------------------ *
   * Preview
   * ------------------------------------------------------------------ */

  const PREVIEW_CSS = `
.pr-preview { position: fixed; inset: 0; z-index: 2000; display: flex; flex-direction: column; background: rgba(15,23,42,.62); }
.pr-bar { display: flex; align-items: center; gap: 12px; padding: 12px 18px; background: #0f172a; color: #fff; flex: 0 0 auto; }
.pr-bar-title { font-weight: 700; font-size: 14px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pr-bar-sub { font-size: 12px; color: #94a3b8; }
.pr-bar-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
.pr-seg { display: inline-flex; background: #1e293b; border: 1px solid #334155; border-radius: 8px; overflow: hidden; }
.pr-seg button { border: 0; background: transparent; color: #cbd5e1; font-size: 12.5px; font-weight: 600; padding: 7px 13px; cursor: pointer; }
.pr-seg button.on { background: #2563eb; color: #fff; }
.pr-btn { border: 1px solid #334155; background: #1e293b; color: #fff; border-radius: 8px; font-size: 13px; font-weight: 600; padding: 8px 15px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.pr-btn:hover { background: #334155; }
.pr-btn-go { background: #2563eb; border-color: #2563eb; }
.pr-btn-go:hover { background: #1d4ed8; }
.pr-stage { flex: 1 1 auto; overflow: auto; padding: 26px 18px 40px; }
/* The sheet is sized to the real page — A4 at 210mm, an 80mm roll at 84mm — so the
   preview is an honest picture of the paper rather than a scaled-down sketch. The
   wrapper holds the sheet at its scaled footprint so the scrollbar matches the
   picture; the sheet itself is only ever scaled visibly, never re-laid-out. */
.pr-sheet-wrap { margin: 0 auto; }
.pr-sheet { box-sizing: border-box; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 13mm; background: #fff; box-shadow: 0 3px 22px rgba(0,0,0,.35); }
.pr-sheet-receipt { box-sizing: border-box; width: 84mm; min-height: 120mm; margin: 0 auto; padding: 4mm; }
.pr-hint { text-align: center; color: #cbd5e1; font-size: 11.5px; margin-top: 14px; }
.pr-frame { position: fixed; width: 0; height: 0; border: 0; right: 0; bottom: 0; visibility: hidden; }
@media print { .pr-preview { display: none !important; } }
`;

  let active = null;   // { build, format, pageRule, title }

  function ensureStyle() {
    if (document.getElementById('pr-preview-style')) return;
    const s = document.createElement('style');
    s.id = 'pr-preview-style';
    // Both sheets, once. The overlay chrome and the document rules are separate
    // strings because the print frame needs SHEET without the overlay, but on screen
    // they have to be present together or the preview shows unstyled markup.
    s.textContent = PREVIEW_CSS + '\n' + SHEET;
    document.head.appendChild(s);
  }

  function sheetClass() {
    return active && active.format === 'receipt' ? 'pr-sheet pr-sheet-receipt' : 'pr-sheet';
  }

  /**
   * The sheet is drawn at its true paper size and, unless the reader has chosen
   * 100%, scaled so the whole page fits the preview window. Scaling is a pure
   * transform — the layout inside stays at paper resolution, so what you see above
   * the fold is exactly what comes out of the printer.
   */
  function applyZoom() {
    const stage = document.getElementById('prStage');
    const wrap = stage && stage.querySelector('.pr-sheet-wrap');
    const sheet = wrap && wrap.querySelector('.pr-sheet');
    if (!wrap || !sheet) return;
    const w = sheet.offsetWidth;
    const h = sheet.offsetHeight;
    // Fit frames the whole sheet in the window, not just its width: a page that
    // runs off the bottom of the screen reads as broken even when nothing is wrong.
    const availW = stage ? (stage.clientWidth - 36) : w;
    const availH = stage ? (stage.clientHeight - 40) : h;
    const s = (active && active.zoom === 'full')
      ? 1
      : Math.min(1, availW / w, availH / h);
    if (active) active.scale = s;
    sheet.style.transformOrigin = 'top left';
    sheet.style.transform = s === 1 ? '' : 'scale(' + s + ')';
    wrap.style.width = Math.round(w * s) + 'px';
    wrap.style.height = Math.round(h * s + 24) + 'px';
  }

  function onResize() {
    if (active) applyZoom();
  }

  function repaint() {
    const stage = document.getElementById('prStage');
    if (!stage || !active) return;
    stage.innerHTML = '<div class="pr-sheet-wrap"><div class="' + sheetClass() + '"><div class="pr-page">' +
      active.build(active.format) + '</div></div></div>';
    applyZoom();
  }

  function closePreview() {
    const el = document.getElementById('prPreview');
    if (el) el.parentNode.removeChild(el);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    active = null;
  }

  function onKey(e) {
    if (e.key === 'Escape' && active) closePreview();
  }

  function runPrint() {
    if (!active) return;
    const title = active.title || 'Print';
    printFrame(title, active.build(active.format), active.pageRule || active.pageRuleFor(active.format));
  }

  /**
   * Shows the preview. Two shapes are accepted:
   *   preview({ title, subtitle, html })                  — a single document
   *   preview({ title, formats:[{id,label}], build:(id) }) — A4 / receipt, etc.
   */
  function preview(opts) {
    opts = opts || {};
    ensureStyle();
    closePreview();

    const formats = opts.formats || null;
    const first = formats ? formats[0] : { id: opts.format || 'a4' };

    active = {
      title: opts.title || 'Print preview',
      subtitle: opts.subtitle || '',
      format: first.id,
      build: opts.build || (() => opts.html || ''),
      pageRuleFor: id => (opts.pageRules && opts.pageRules[id]) || (id === 'receipt'
        ? '@page{size:80mm auto;margin:2mm}'
        : '@page{size:A4 portrait;margin:12mm}')
    };
    active.pageRule = active.pageRuleFor(active.format);

    const wrap = document.createElement('div');
    wrap.id = 'prPreview';
    wrap.className = 'pr-preview';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', active.title);
    wrap.innerHTML =
      '<div class="pr-bar">' +
        '<div style="min-width:0">' +
          '<div class="pr-bar-title">' + esc(active.title) + '</div>' +
          (active.subtitle ? '<div class="pr-bar-sub">' + esc(active.subtitle) + '</div>' : '') +
        '</div>' +
        (formats ? '<div class="pr-seg" role="group" aria-label="Paper size">' +
          formats.map((f, i) => '<button type="button" data-fmt="' + esc(f.id) + '"' +
            (i === 0 ? ' class="on"' : '') + '>' + esc(f.label) + '</button>').join('') +
        '</div>' : '') +
        '<div class="pr-seg" role="group" aria-label="Zoom">' +
          '<button type="button" data-zoom="fit" class="on">Fit</button>' +
          '<button type="button" data-zoom="full">100%</button>' +
        '</div>' +
        '<div class="pr-bar-actions">' +
          '<button class="pr-btn" type="button" id="prClose"><i class="bi bi-x-lg"></i> Close</button>' +
          '<button class="pr-btn pr-btn-go" type="button" id="prGo"><i class="bi bi-printer"></i> Print</button>' +
        '</div>' +
      '</div>' +
      '<div class="pr-stage" id="prStage"></div>' +
      '<div class="pr-hint">Nothing is sent to the printer until you press Print — the next screen is your browser\'s own print dialog, where you can also choose <strong>Save as PDF</strong>.</div>';

    document.body.appendChild(wrap);
    active.zoom = 'fit';
    active.scale = 1;
    repaint();

    wrap.querySelector('#prClose').addEventListener('click', closePreview);
    wrap.querySelector('#prGo').addEventListener('click', runPrint);
    wrap.addEventListener('mousedown', e => { if (e.target === wrap) closePreview(); });

    const seg = wrap.querySelectorAll('.pr-seg button');
    Array.prototype.forEach.call(seg, b => b.addEventListener('click', () => {
      Array.prototype.forEach.call(seg, x => x.classList.remove('on'));
      b.classList.add('on');
      if (b.dataset.fmt) {
        active.format = b.dataset.fmt;
        active.pageRule = active.pageRuleFor(active.format);
        // A different paper size starts afresh fitted to the window.
        active.zoom = 'fit';
        repaint();
        Array.prototype.forEach.call(seg, x => x.classList.remove('on'));
        const fit = wrap.querySelector('[data-zoom="fit"]');
        if (fit) fit.classList.add('on');
      } else if (b.dataset.zoom) {
        active.zoom = b.dataset.zoom;
        applyZoom();
      }
    }));

    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    const go = wrap.querySelector('#prGo');
    if (go) go.focus();
  }

  /* ------------------------------------------------------------------ *
   * Putting the option where people look for it
   * ------------------------------------------------------------------ */

  const SECTION_ICON = '<i class="bi bi-printer"></i>';

  /** A section card's own Print button, added to its header. */
  function attachSection(header) {
    if (!header || header.querySelector('[data-pr-section]')) return;
    const card = header.closest ? header.closest('.card') : null;
    if (!card || (card.closest && card.closest('.modal, .pr-preview, [role="dialog"]'))) return;
    // A section needs something to print: a header alone is a heading, not a report.
    if (!card.querySelector('.table, .card-body, .table-wrap, canvas, ul, ol, dl')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-ghost btn-icon ms-auto no-print';
    btn.setAttribute('data-pr-section', '1');
    btn.title = 'Preview and print this section';
    btn.setAttribute('aria-label', 'Preview and print this section');
    btn.innerHTML = SECTION_ICON;
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      preview({
        title: (header.textContent || '').replace(/\s+/g, ' ').trim() || document.title,
        subtitle: setting('biz.name', ''),
        html: '<div class="app-print">' + cleaned(card) + '</div>'
      });
    });

    // Put it at the end of the header so it never shifts the title.
    header.appendChild(btn);
  }

  function scan() {
    const content = document.getElementById('pageContent');
    if (!content) return;
    Array.prototype.forEach.call(content.querySelectorAll('.card-header'), attachSection);
  }

  /** The whole current page — the print option that is always on offer. */
  function page() {
    const content = document.getElementById('pageContent');
    if (!content) return;
    preview({
      title: (document.querySelector('.page-title') && document.querySelector('.page-title').textContent) || document.title,
      subtitle: setting('biz.name', ''),
      html: '<div class="app-print">' + cleaned(content) + '</div>'
    });
  }

  // Sections appear and disappear as filters and pages re-render, so re-check when the
  // page changes rather than only once at startup. Debounced, and attachSection is
  // idempotent, so this cannot loop on itself.
  let scanTimer = null;
  function scanSoon() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 160);
  }

  let observing = false;
  function observe() {
    if (observing) return;
    const content = document.getElementById('pageContent');
    if (!content || !window.MutationObserver) return;
    observing = true;
    new MutationObserver(scanSoon).observe(content, { childList: true, subtree: true });
  }

  return {
    preview: preview,
    close: closePreview,
    invoice: invoice,
    record: record,
    list: list,
    cleaned: cleaned,
    page: page,
    scan: scan,
    observe: observe
  };
})();
