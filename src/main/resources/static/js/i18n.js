/* EDY ERP - i18n core (EN / AR with RTL).
 * Load this file FIRST on every page, before layout.js and page scripts.
 * - Persists the chosen language in localStorage ('edy.language').
 * - For Arabic, applies a non-destructive, reversible text-node phrase
 *   substitution driven by the AR dictionary; untranslated strings stay
 *   English so the app always degrades gracefully and never breaks.
 * - Switches the document to right-to-left (RTL) for Arabic.
 * - A MutationObserver auto-translates dynamically rendered content.
 * Also exposes EDY.i18n.t() for token-based translation. */
window.EDY = window.EDY || {};

(function () {
  const KEY = 'edy.language';

  /* Arabic dictionary: EN phrase (or fragment) -> AR text.
     Longest keys are matched first so full phrases win over single words. */
  const AR = {
    /* ---- shared / chrome ---- */
    'EDY ERP': 'EDY ERP',
    'Business Suite': 'حزمة الأعمال',
    'Main Menu': 'القائمة الرئيسية',
    'Dashboard': 'لوحة التحكم',
    'POS / New Sale': 'نقطة البيع / بيع جديد',
    'POS': 'نقطة البيع',
    'New Sale': 'بيع جديد',
    'Sales': 'المبيعات',
    'All Sales': 'كل المبيعات',
    'Edit / Cancel Sale': 'تعديل / إلغاء بيع',
    'Cancel Sale': 'إلغاء البيع',
    'List Quotations': 'قائمة عروض الأسعار',
    'Add Quotation': 'إضافة عرض سعر',
    'Import Sales': 'استيراد المبيعات',
    'Deleted Sales': 'المبيعات المحذوفة',
    'Purchases': 'المشتريات',
    'List Purchase Orders': 'قائمة أوامر الشراء',
    'New Purchase Order': 'أمر شراء جديد',
    'Import Purchases': 'استيراد المشتريات',
    'Products': 'المنتجات',
    'All Products': 'كل المنتجات',
    'Add Product': 'إضافة منتج',
    'Categories': 'التصنيفات',
    'Import / Export': 'استيراد / تصدير',
    'Inventory / Stock': 'المخزون',
    'Stock Movements': 'حركات المخزون',
    'Low / Out of Stock': 'منخفض / نفد من المخزون',
    'Adjust Stock': 'تعديل المخزون',
    'Customers': 'العملاء',
    'All Customers': 'كل العملاء',
    'Add Customer': 'إضافة عميل',
    'Import Customers': 'استيراد العملاء',
    'Suppliers': 'الموردون',
    'All Suppliers': 'كل الموردين',
    'Add Supplier': 'إضافة مورد',
    'Expenses': 'المصروفات',
    'All Expenses': 'كل المصروفات',
    'Add Expense': 'إضافة مصروف',
    'Payment Accounts': 'الحسابات المالية',
    'List Accounts': 'قائمة الحسابات',
    'Fund Transfer': 'تحويل أموال',
    'Balance Sheet': 'الميزانية العمومية',
    'Trial Balance': 'ميزان المراجعة',
    'Cash Flow': 'التدفق النقدي',
    'Payment Account Report': 'تقرير الحسابات',
    'Add Account': 'إضافة حساب',
    'Edit Account': 'تعديل حساب',
    'Reports': 'التقارير',
    'Reports & Analytics': 'التقارير والتحليلات',
    'VAT / Tax Report': 'تقرير الضريبة',
    'Charts': 'الرسوم البيانية',
    'Profit & Loss': 'الأرباح والخسائر',
    'Sales Tax (VAT)': 'ضريبة المبيعات (القيمة المضافة)',
    'Daybook Summary': 'ملخص اليومية',
    'Activity Log': 'سجل النشاط',
    'Purchase & Sale': 'الشراء والبيع',
    'Trending Products': 'المنتجات الرائجة',
    'Product-wise Sales': 'المبيعات حسب المنتج',
    'Product-wise Purchases': 'المشتريات حسب المنتج',
    'Sale Payment Report': 'تقرير مدفوعات المبيعات',
    'Purchase Payment Report': 'تقرير مدفوعات المشتريات',
    'Stock Report': 'تقرير المخزون',
    'Opening Stock': 'رصيد افتتاحي',
    'Stock Adjustments': 'تسويات المخزون',
    'Items (Catalog)': 'الأصناف (الدليل)',
    'Customer & Supplier': 'العملاء والموردون',
    'Customer Groups': 'مجموعات العملاء',
    'Master Data': 'البيانات الأساسية',
    'Expense Report': 'تقرير المصروفات',
    'Cash Register': 'خزنة النقد',
    'Sales Representative': 'مندوب المبيعات',
    'Product Commission': 'عمولة المنتجات',
    'Users & Roles': 'المستخدمون والأدوار',
    'Settings': 'الإعدادات',
    'Profile': 'الملف الشخصي',
    'Logout': 'تسجيل الخروج',
    'Notifications': 'الإشعارات',
    'View all': 'عرض الكل',
    'All caught up': 'لا توجد إشعارات جديدة',

    /* ---- common verbs ---- */
    'Add': 'إضافة',
    'Save': 'حفظ',
    'Delete': 'حذف',
    'Edit': 'تعديل',
    'Cancel': 'إلغاء',
    'Close': 'إغلاق',
    'Print': 'طباعة',
    'Export': 'تصدير',
    'Import': 'استيراد',
    'Download': 'تنزيل',
    'Submit': 'إرسال',
    'Search': 'بحث',
    'View': 'عرض',
    'New': 'جديد',
    'Actions': 'إجراءات',
    'Edit Sale': 'تعديل البيع',
    'Complete Sale': 'إتمام البيع',
    'Complete Sale & Print': 'إتمام البيع والطباعة',

    /* ---- statuses ---- */
    'Paid': 'مدفوع',
    'Unpaid': 'غير مدفوع',
    'Pending': 'قيد الانتظار',
    'Completed': 'مكتمل',
    'Complete': 'مكتمل',
    'Cancelled': 'ملغي',
    'Active': 'نشط',
    'Inactive': 'غير نشط',
    'Draft': 'مسودة',
    'Confirmed': 'مؤكد',
    'SENT': 'مرسل',
    'Sent': 'مرسل',
    'Done': 'تم',

    /* ---- POS / sales / quotations ---- */
    'Name': 'الاسم',
    'Quantity': 'الكمية',
    'Unit Price': 'سعر الوحدة',
    'Subtotal': 'المجموع الفرعي',
    'Discount': 'الخصم',
    'Notes': 'ملاحظات',
    'Invoice #': 'رقم الفاتورة',
    'Date': 'التاريخ',
    'Customer': 'العميل',
    'Product': 'المنتج',
    'Total': 'الإجمالي',
    'VAT': 'الضريبة',
    'Payment Method': 'طريقة الدفع',
    'Cash': 'نقدي',
    'Card': 'بطاقة',
    'Mobile Payment': 'الدفع عبر الجوال',
    'Walk-in Customer': 'عميل مباشر',

    /* ---- toasts ---- */
    'Customer created': 'تم إنشاء العميل',
    'Customer updated': 'تم تحديث العميل',
    'Customer deleted': 'تم حذف العميل',
    'Supplier created': 'تم إنشاء المورد',
    'Supplier updated': 'تم تحديث المورد',
    'Supplier deleted': 'تم حذف المورد',
    'Product created': 'تم إنشاء المنتج',
    'Product updated': 'تم تحديث المنتج',
    'Product deleted': 'تم حذف المنتج',
    'Settings saved': 'تم حفظ الإعدادات',
    'Password updated': 'تم تحديث كلمة المرور',
    'Sale created': 'تم إنشاء البيع',
    'Sale updated': 'تم تحديث البيع',
    'Sale deleted': 'تم حذف البيع',
    'Purchase order created': 'تم إنشاء أمر الشراء',
    'Purchase order updated': 'تم تحديث أمر الشراء',
    'Purchase order deleted': 'تم حذف أمر الشراء',
    'Quotation created': 'تم إنشاء عرض السعر',
    'Quotation updated': 'تم تحديث عرض السعر',
    'Quotation deleted': 'تم حذف عرض السعر',
    'Quotation converted': 'تم تحويل عرض السعر',
    'Held sale restored': 'تم استعادة البيع المعلق',
    'Saved': 'تم الحفظ'
  };

  function current() {
    try { return localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en'; }
    catch (e) { return 'en'; }
  }
  function isArabic() { return current() === 'ar'; }

  /* translate an arbitrary text value (phrase substitution) */
  function t(text) {
    if (!text || !isArabic()) return text;
    let out = String(text);
    const keys = Object.keys(AR).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      if (!k) continue;
      const re = new RegExp('(^|[^A-Za-z0-9])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9])', 'g');
      out = out.replace(re, '$1' + AR[k]);
    }
    return out;
  }

  /* ---- DOM-level application (text nodes only, reversible) ---- */
  const originals = new WeakMap();
  function isSkippable(el) {
    const tag = el && el.tagName;
    return !!tag && ['SCRIPT', 'STYLE', 'TEXTAREA', 'PRE', 'CODE', 'OPTION'].indexOf(tag) !== -1;
  }
  function walk(root, fn) {
    const nodes = [];
    (function go(n) {
      if (!n || n.nodeType !== 1) return;
      if (n.hasAttribute && (n.hasAttribute('data-noi18n') || isSkippable(n))) return;
      for (const ch of n.childNodes) {
        if (ch.nodeType === 3) nodes.push(ch);
        else if (ch.nodeType === 1) go(ch);
      }
    })(root);
    nodes.forEach(fn);
  }
  function applyNodeText(node) {
    if (isArabic()) {
      if (!originals.has(node)) originals.set(node, node.textContent);
      const translated = t(originals.get(node));
      if (translated !== node.textContent) node.textContent = translated;
    } else {
      if (originals.has(node)) node.textContent = originals.get(node);
    }
  }
  function apply(root) {
    const r = (root && root.nodeType === 1) ? root : document.body;
    if (!r) return;
    walk(r, applyNodeText);
    setChrome();
  }
  function setChrome() {
    const arabic = isArabic();
    document.documentElement.setAttribute('lang', arabic ? 'ar' : 'en');
    document.documentElement.setAttribute('dir', arabic ? 'rtl' : 'ltr');
    document.body && document.body.classList.toggle('edy-rtl', arabic);
  }

  /* store originals for future nodes too (so toggling back restores them) */
  function store(root) {
    const r = (root && root.nodeType === 1) ? root : document.body;
    if (!r) return;
    walk(r, n => { if (!originals.has(n)) originals.set(n, n.textContent); });
  }

  function setLang(l) {
    const v = l === 'ar' ? 'ar' : 'en';
    try { localStorage.setItem(KEY, v); } catch (e) {}
    apply(document.body);          /* apply() snapshots English originals first */
  }

  function toggle() {
    setLang(isArabic() ? 'en' : 'ar');
    return current();
  }

  /* auto-translate dynamically injected content while Arabic is active */
  function startObserver() {
    if (!window.MutationObserver) return;
    setChrome();
    new MutationObserver(muts => {
      if (!isArabic()) return;
      for (const m of muts) {
        for (const n of m.addedNodes || []) {
          if (n.nodeType === 3) applyNodeText(n);
          else if (n.nodeType === 1) walk(n, applyNodeText);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { setChrome(); startObserver(); apply(document.body); });
  } else {
    setChrome(); startObserver(); apply(document.body);
  }

  EDY.i18n = { current, isArabic, t, apply, setLang, toggle, AR };
})();
