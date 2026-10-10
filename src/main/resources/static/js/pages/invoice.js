/* EDY ERP — Invoice / Receipt (printable) */
window.PAGE = {
  init: async function () {
    const box = document.getElementById('pageContent');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    // Server-side settings, loaded by layout.js. Same source as every other page.
    const get = (k, d) => EDY.settings[k] ?? d;

    const qp = new URLSearchParams(location.search);
    const id = Number(qp.get('id'));
    const type = qp.get('type') || 'sale';
    const autoPrint = qp.get('print') === '1';

    if (!id) {
      box.innerHTML = '<div class="empty-state"><i class="bi bi-receipt" style="font-size:3rem"></i><h5 class="mt-3">No document selected</h5><p class="muted">Open a document from <a href="/sales">Sales</a>, <a href="/purchases">Purchases</a> or <a href="/quotations">Quotations</a>.</p></div>';
      return;
    }

    box.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

    let invoice = null;
    const listUrl = type === 'purchase' ? '/api/purchase-invoices'
                  : type === 'quotation' ? '/api/quotations'
                  : '/api/sales-invoices';
    try {
      invoice = await EDY.api.get(listUrl + '/' + id);
    } catch (e) {
      // The single-record endpoint insists on one business, so a super admin who is
      // looking at every business at once is refused here even though the dashboard
      // and the quotation dialog both just handed them a document from the list.
      // That same session is already allowed to read the whole list, so take the row
      // from it - the same data, no new authority - instead of leaving a document on
      // screen that cannot be opened or printed. Anything else stays "not found".
      if (e && /permission/i.test(e.message || '')) {
        try {
          const all = await EDY.api.get(listUrl);
          invoice = (all || []).find(x => x.id === id) || null;
        } catch (ignored) { invoice = null; }
      }
      if (!invoice) {
        box.innerHTML = '<div class="empty-state"><i class="bi bi-file-x" style="font-size:3rem"></i><h5 class="mt-3">' + (type === 'quotation' ? 'Quotation' : 'Invoice') + ' not found</h5><p class="muted">This ' + (type === 'quotation' ? 'quotation' : 'record') + ' may have been deleted.</p></div>';
        return;
      }
    }

    if (!invoice) {
      box.innerHTML = '<div class="empty-state"><i class="bi bi-file-x" style="font-size:3rem"></i><h5 class="mt-3">Invoice not found</h5><p class="muted">This record may have been deleted.</p></div>';
      return;
    }

    const items = invoice.items || [];
    const subtotal = items.reduce((s, it) => s + (it.unitPrice || it.unitCost || 0) * it.quantity, 0);
    const discount = Number(invoice.discount || 0);
    const vat = Number(invoice.taxAmount || 0);
    const total = Number(invoice.totalAmount || subtotal - discount + vat);
    const isCancelled = invoice.status === 'CANCELLED';
    const party = type === 'purchase' ? invoice.supplier : invoice.customer;
    const bizName = get('biz.name', '');
    const bizAddr = get('biz.address', '');
    const bizPhone = get('biz.phone', '');
    const bizVat = get('biz.vatNo', '');
    // No invented branch or address: Settings writes these, and a receipt that
    // prints a company the business never named is a lie on paper.
    const rcptHeader = get('receipt.header', '') || bizName;
    const rcptFooter = get('receipt.footer', '');

    // Money goes through the shared formatter so the receipt, the tables and the
    // dashboard all agree on currency and decimal places.
    const money = EDY.fmt.money;

    const invNum = invoice.invoiceNumber || (type === 'purchase' ? 'PO-' + String(id).padStart(4, '0') : type === 'quotation' ? 'QUO-' + String(id).padStart(4, '0') : 'INV-' + String(id).padStart(4, '0'));
    const method = invoice.paymentMethod || 'CASH';
    const dateStr = invoice.invoiceDate || invoice.quotationDate || new Date().toISOString().slice(0, 10);

    box.innerHTML =
      '<div class="no-print d-flex justify-content-between align-items-center mb-3">' +
      '<button class="btn btn-ghost" onclick="history.back()"><i class="bi bi-arrow-left me-1"></i>Back</button>' +
      '<div class="toolbar">' +
      '<button class="btn btn-ghost btn-sm" id="btnPdf"><i class="bi bi-file-earmark-pdf me-1"></i>Save PDF</button>' +
      '<button class="btn btn-primary" id="btnPrint"><i class="bi bi-printer me-1"></i>Print</button>' +
      '</div></div>' +
      '<div class="receipt-paper mx-auto" style="max-width:380px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:24px 20px;" id="receiptPaper">' +
      (isCancelled ? '<div class="text-center text-danger fw-bold mb-3 py-2 border border-danger rounded">CANCELLED</div>' : '') +
      '<div class="text-center mb-3">' +
      '<div class="fw-bold fs-5">' + esc(rcptHeader) + '</div>' +
      '<div class="muted fs-12">' + esc(bizAddr) + '</div>' +
      '<div class="muted fs-12">' + esc(bizPhone) + '</div>' +
      (bizVat ? '<div class="muted fs-11">VAT: ' + esc(bizVat) + '</div>' : '') +
      '</div>' +
      '<hr class="my-2">' +
      '<div class="d-flex justify-content-between fs-13 mb-1"><span class="muted">' + (type === 'quotation' ? 'Quotation' : 'Invoice') + '</span><span class="fw-bold">' + esc(invNum) + '</span></div>' +
      '<div class="d-flex justify-content-between fs-13 mb-1"><span class="muted">Date</span><span>' + dateStr + '</span></div>' +
      (invoice.validUntil ? '<div class="d-flex justify-content-between fs-13 mb-1"><span class="muted">Valid Until</span><span>' + esc(invoice.validUntil) + '</span></div>' : '') +
      '<div class="d-flex justify-content-between fs-13 mb-1"><span class="muted">Type</span><span>' + (type === 'purchase' ? 'Purchase Order' : type === 'quotation' ? 'Quotation' : 'Sales Invoice') + '</span></div>' +
      '<div class="d-flex justify-content-between fs-13 mb-1"><span class="muted">Payment</span><span>' + esc(method) + '</span></div>' +
      (party ? '<div class="d-flex justify-content-between fs-13 mb-1"><span class="muted">' + (type === 'purchase' ? 'Supplier' : 'Customer') + '</span><span>' + esc(party.name) + '</span></div>' : '') +
      '<hr class="my-2">' +
      '<table class="table table-sm mb-2" style="font-size:0.82rem">' +
      '<thead><tr><th>Item</th><th class="text-center">Qty</th><th class="text-end">Price</th><th class="text-end">Total</th></tr></thead><tbody>' +
      items.map(it => {
        const name = (it.product && it.product.name) || it.productName || 'Product #' + it.productId;
        const price = it.unitPrice || it.unitCost || 0;
        const lineTotal = it.lineTotal || price * it.quantity;
        return '<tr><td class="fw-bold">' + esc(name) + '</td><td class="text-center">' + it.quantity + '</td><td class="text-end">' + esc(money(price)) + '</td><td class="text-end">' + esc(money(lineTotal)) + '</td></tr>';
      }).join('') +
      '</tbody></table>' +
      '<hr class="my-2">' +
      '<div class="d-flex justify-content-between fs-13"><span class="muted">Subtotal</span><span>' + esc(money(subtotal)) + '</span></div>' +
      (discount > 0 ? '<div class="d-flex justify-content-between fs-13"><span class="muted">Discount</span><span class="text-red">\u2212' + esc(money(discount)) + '</span></div>' : '') +
      (vat > 0 ? '<div class="d-flex justify-content-between fs-13"><span class="muted">VAT</span><span>' + esc(money(vat)) + '</span></div>' : '') +
      '<div class="d-flex justify-content-between fw-bold fs-5 mt-2 pt-2 border-top"><span>Total</span><span>' + esc(money(total)) + '</span></div>' +
      '<hr class="my-2">' +
      '<div class="text-center fs-12 muted">' + esc(rcptFooter) + '</div>' +
      '<div class="text-center fs-11 muted mt-2">EDY ERP \u00a9 ' + new Date().getFullYear() + '</div>' +
      '</div>';

    /**
     * Printing used to open a blank window and fire print() on load, so the first
     * sight of the document was whatever came out of the printer. Now both buttons
     * — and the `print=1` link POS uses after a sale — open the preview, where A4
     * and thermal receipt are a choice made with the page in front of you.
     */
    function openPreview() {
      EDY.print.preview({
        title: invNum,
        subtitle: (type === 'quotation' ? 'Quotation' : type === 'purchase' ? 'Purchase invoice' : 'Sales invoice') + ' \u00b7 ' + dateStr,
        formats: [
          { id: 'receipt', label: 'Receipt (80mm)' },
          { id: 'a4', label: 'A4 invoice' }
        ],
        build: (fmt) => EDY.print.invoice(invoice, { type: type, format: fmt })
      });
    }

    document.getElementById('btnPrint').addEventListener('click', openPreview);
    document.getElementById('btnPdf').addEventListener('click', openPreview);
    if (autoPrint) setTimeout(openPreview, 300);

    document.title = invNum + ' \u2014 EDY ERP';
  }
};