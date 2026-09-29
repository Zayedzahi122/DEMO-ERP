/* EDY ERP — Invoice / Receipt (printable) */
window.PAGE = {
  init: async function () {
    const box = document.getElementById('pageContent');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const get = (k, d) => localStorage.getItem('edy.' + k) || d;

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
    try {
      if (type === 'purchase') invoice = await EDY.api.get('/api/purchase-invoices/' + id);
      else if (type === 'quotation') invoice = await EDY.api.get('/api/quotations/' + id);
      else invoice = await EDY.api.get('/api/sales-invoices/' + id);
    } catch (e) {
      box.innerHTML = '<div class="empty-state"><i class="bi bi-file-x" style="font-size:3rem"></i><h5 class="mt-3">' + (type === 'quotation' ? 'Quotation' : 'Invoice') + ' not found</h5><p class="muted">This ' + (type === 'quotation' ? 'quotation' : 'record') + ' may have been deleted.</p></div>';
      return;
    }

    const items = invoice.items || [];
    const subtotal = items.reduce((s, it) => s + (it.unitPrice || it.unitCost || 0) * it.quantity, 0);
    const discount = Number(invoice.discount || 0);
    const vat = Number(invoice.taxAmount || 0);
    const total = Number(invoice.totalAmount || subtotal - discount + vat);
    const isCancelled = invoice.status === 'CANCELLED';
    const party = type === 'purchase' ? invoice.supplier : invoice.customer;
    const currency = get('currency', 'OMR');
    const currencySymbol = currency === 'USD' ? '$' : currency === 'SAR' ? 'SAR' : currency === 'AED' ? 'AED' : 'OMR';
    const bizName = get('bizName', 'EDY ERP');
    const bizAddr = get('bizAddress', 'Muscat, Oman');
    const bizPhone = get('bizPhone', '+968 24XX XXXX');
    const bizVat = get('bizVat', 'OM 123456789012345');
    const rcptHeader = get('receiptHeader', bizName + ' \u2014 Main Branch');
    const rcptFooter = get('receiptFooter', 'Thank you for your business! \u0634\u0643\u0631\u0627\u064b');

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
      '<div class="muted fs-11">VAT: ' + esc(bizVat) + '</div>' +
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
        return '<tr><td class="fw-bold">' + esc(name) + '</td><td class="text-center">' + it.quantity + '</td><td class="text-end">' + currencySymbol + ' ' + Number(price).toFixed(3) + '</td><td class="text-end">' + currencySymbol + ' ' + Number(lineTotal).toFixed(3) + '</td></tr>';
      }).join('') +
      '</tbody></table>' +
      '<hr class="my-2">' +
      '<div class="d-flex justify-content-between fs-13"><span class="muted">Subtotal</span><span>' + currencySymbol + ' ' + subtotal.toFixed(3) + '</span></div>' +
      (discount > 0 ? '<div class="d-flex justify-content-between fs-13"><span class="muted">Discount</span><span class="text-red">\u2212' + currencySymbol + ' ' + discount.toFixed(3) + '</span></div>' : '') +
      '<div class="d-flex justify-content-between fs-13"><span class="muted">VAT (5%)</span><span>' + currencySymbol + ' ' + vat.toFixed(3) + '</span></div>' +
      '<div class="d-flex justify-content-between fw-bold fs-5 mt-2 pt-2 border-top"><span>Total</span><span>' + currencySymbol + ' ' + total.toFixed(3) + '</span></div>' +
      '<hr class="my-2">' +
      '<div class="text-center fs-12 muted">' + esc(rcptFooter) + '</div>' +
      '<div class="text-center fs-11 muted mt-2">EDY ERP \u00a9 ' + new Date().getFullYear() + '</div>' +
      '</div>';

    function printReceipt() {
      const paper = document.getElementById('receiptPaper');
      const printWin = window.open('', '_blank', 'width=420,height=800');
      if (printWin) {
        printWin.document.write('<html><head><title>' + esc(invNum) + '</title><style>' +
          'body{font-family:monospace;max-width:380px;margin:0 auto;padding:16px;font-size:13px;color:#000}' +
          'table{width:100%;border-collapse:collapse}th,td{padding:2px 4px;text-align:left}th{font-weight:600}' +
          '.text-center{text-align:center}.text-end,.text-right{text-align:right}.text-red{color:#ef4444}' +
          '.text-danger{color:#dc2626}.text-primary{color:#2563eb}.text-green{color:#10b981}' +
          '.fw-bold{font-weight:700}.fw-semibold{font-weight:600}.muted{color:#64748b}' +
          'hr{border:none;border-top:1px dashed #cbd5e1;margin:8px 0}' +
          '.table{margin-bottom:8px}.table td{border-bottom:1px dashed #e2e8f0}' +
          'h1,h2,h3,h4,h5,h6{margin:0}.mb-1{margin-bottom:4px}.mb-2{margin-bottom:8px}.mb-3{margin-bottom:12px}' +
          '.mt-2{margin-top:8px}.pt-2{padding-top:8px}.py-2{padding:8px 0}.border-top{border-top:1px solid #e2e8f0}' +
          '.border{border:1px solid #e2e8f0}.rounded{border-radius:4px}' +
          '@media print{@page{size:80mm auto; margin:2mm}body{padding:0;font-size:11px}}' +
          '</style></head><body>' + paper.innerHTML + '<script>window.onload=function(){setTimeout(function(){window.print();window.close()},200)}<\/script></body></html>');
        printWin.document.close();
      }
    }

    document.getElementById('btnPrint').addEventListener('click', printReceipt);
    document.getElementById('btnPdf').addEventListener('click', printReceipt);
    if (autoPrint) setTimeout(printReceipt, 400);

    document.title = invNum + ' \u2014 EDY ERP';
  }
};