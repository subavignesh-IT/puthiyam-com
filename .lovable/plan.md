# POS & Billing Upgrade: GST, PDF/Thermal Bills, Stock Audit, Customer History

A large batch of features, grouped so each phase is usable on its own.

## Phase 1 — Database foundations
- `stock_audit_log`: product, variant, quantity before/after, change, reason (POS sale, online order, manual edit), order reference, seller, timestamp. Written by the existing stock-decrement function so every checkout is recorded automatically. Realtime enabled so the seller dashboard updates live.
- `gst_settings` per seller: GSTIN number, default GST rate, whether prices are GST-inclusive.
- Products get an optional GST rate and HSN code; the purchase price field is exposed for entry.
- Product variants get their own optional barcode field.
- Orders get GST fields (taxable value, GST rate, GST amount, seller GSTIN) filled at billing time.
- `bill_deliveries`: which bill was sent to which customer, channel, status — so automatic sending can be retried and audited.

## Phase 2 — Customer order history
- Seller/admin: a Customers view where picking a customer shows every invoice, payment status (paid / pending / partly paid), totals, and the ratings/reviews that customer left. Each row opens the invoice preview with print/PDF/share.
- Customer-facing: the existing My Orders page gains invoice download (JPG + PDF), payment status badges, and the review left per item.

## Phase 3 — Stock audit log on seller dashboard
- New "Stock Audit" tab: live-updating table of every decrement with product/variant, qty change, resulting stock, source order, and time. Filters by product and date range, CSV export.

## Phase 4 — Invoices: A4, PDF, thermal
- The invoice component gets a true A4 page layout (210x297mm) so print and PDF match.
- Every POS and online invoice gets: JPG preview (existing), **PDF download/share**, **A4 print**, and **thermal receipt print**.
- Thermal: a compact 58/80mm receipt layout printed through the browser print dialog (works with any installed thermal printer), plus an optional direct Bluetooth ESC/POS send for supported Android/Chrome printers.
- POS shows the print/PDF actions only after payment succeeds.

## Phase 5 — Barcodes
- Barcode tab: checkbox selection across products and variants, "Print selected" composes an **A4 sheet** of labels (grid of 1"x2.5" stickers, correct margins) for many products at once, plus PDF download of that sheet.
- Variant-level barcodes: generate/assign per variant, and POS scanning resolves a variant barcode straight to that variant.

## Phase 6 — GST tab
- Manual mode: set GSTIN and default rate, override rate per product, and see GST computed per bill (taxable value, rate, GST amount, total).
- Reports: bill-wise and customer-wise GST summaries for a chosen period, with totals ready for filing and CSV export.
- AI mode: suggests a GST rate + HSN code per product from its name (seller reviews and applies), and generates a plain-language filing summary of the period's GST totals.
- Seller sales management shows GSTIN and GST-inclusive sale totals.

## Phase 7 — Loyalty & automatic bill delivery
- Loyalty management smoothing: clearer stamp/points progress, manual adjust, redemption history per customer, all inside the seller's own loyalty settings.
- After any confirmed order — online checkout or POS — the bill image is sent to the customer on WhatsApp automatically (existing WhatsApp function), with delivery status recorded and a retry button on the order row.

## Technical notes
- Stock audit is written inside the existing `decrement_variant_stock` database function so no checkout path can bypass it; realtime via the Supabase publication.
- PDF generation client-side (jspdf + the existing html-to-image render) so no server round-trip; same DOM node drives JPG, PDF and print.
- Thermal ESC/POS uses Web Bluetooth, feature-detected and hidden where unsupported; browser print is always available.
- GST AI uses Lovable AI (Gemini Flash) in an edge function returning structured rate/HSN suggestions; no rates are applied without seller confirmation.
- A4 label sheet built as a print-CSS grid so one dialog prints all selected labels.

Phases 1-3 first, then 4-5, then 6-7 — I'll confirm as each lands.
