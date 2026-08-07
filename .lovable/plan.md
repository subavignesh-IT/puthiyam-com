# POS invoices, barcode labels, customer ratings & search upgrades

## 1. Seller dashboard tabs — exactly two rows
Rebuild the tab bar as a fixed 2-row grid (5 per row on desktop, 4-5 per row on mobile with smaller icons/labels) so it never overflows into a third row regardless of role.

## 2. Product search by image (all users)
Add a camera button inside the home/search bar with two modes:
- Scan mode: opens the existing camera scanner; a matched barcode jumps straight to that product.
- Photo mode: take/upload a photo, sent to an AI vision call that matches it against the catalog (name, category, description) and returns the best matches, which then filter the product grid.
Falls back gracefully with a clear message when no match is found.

## 3. Barcode management — bigger display + printable labels
- Larger, high-contrast barcode preview per product in the Barcodes tab.
- "Auto-generate" now also renders a real scannable barcode image (Code128) with the product name and code beneath it.
- Each label is sized for a 1 x 2.5 inch sticker, with Download (PNG) and Print buttons, plus a "Print all labels" sheet that tiles labels at the same physical size.

## 4. New invoice design (matches your reference bill)
A single new invoice component styled like your screenshot — red/dark header band with phone + email, "PUTHIYAM_PRODUCTS" block, "Bill of Supply" title, Bill To panel, invoice no. + date, numbered item table (Item, Qty, Unit, Price/Unit, Amount), totals panel (Sub Total, Total, Received, Balance, Payment Mode), amount in words, terms, and a UPI "click to pay" QR block. Used everywhere: POS bills, online checkout bills, and the seller order preview.
- The payment QR is always printed (cash or UPI), encoding the UPI ID and the exact bill amount.
- The bill also carries a rating link + rating QR.

## 5. Customer rating page (replaces POS rating form)
- Remove the in-POS rating/feedback form entirely.
- New public page `/rate/:orderId` listing the ordered items with 5-star rating and a comment box per item; submissions save to the existing feedback table.
- After a POS sale completes, the customer automatically receives the bill plus the item descriptions and the rating link on WhatsApp.

## 6. WhatsApp share opens the customer's chat directly
Bill sharing builds a `wa.me/91<customer number>` deep link pre-filled with the thank-you text (and attempts native file share of the JPG first), so the customer's chat opens automatically instead of a blank share sheet.

## 7. POS pricing visibility toggles
- Add a purchase (cost) price field to the product add/edit form.
- In POS, a toggle reveals per-line wholesale price and purchase price plus margin — off by default, seller-only, never printed on the customer bill.

## 8. Seller dashboard orders tab
- Remove the Items column from the orders table (keeps rows compact).
- Add a "Show Bill" button per order that opens a preview dialog of the new invoice with Print and Download JPG actions.

## Technical notes
- New deps: a barcode renderer (Code128) and a QR renderer for the invoice/label images; JPG/PNG export continues via the existing `html-to-image`.
- Migration: add `purchase_price` to `products` (nullable numeric).
- New files: invoice component, barcode label component, `/rate/:orderId` page, image-search dialog, and an AI image-match edge function (Lovable AI, server-side).
- Rating page is publicly readable by order id; feedback inserts allowed for anonymous submitters scoped to a valid order, with read access limited to the owning seller and admins.
- Existing branding, catalog, cart, and payment flows stay unchanged.
