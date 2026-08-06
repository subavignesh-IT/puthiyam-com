# POS as a Page, Barcodes, Stock Sync & Auto Bill Delivery

## 1. POS becomes its own page

- New route `/pos` rendering a full-screen POS page (moves the existing POS component out of the dashboard tab).
- The "POS" button on the seller dashboard (and avatar menu) navigates to `/pos` instead of switching tabs. Access limited to sellers/admins; a back button returns to the dashboard.

## 2. Barcode management tab (seller dashboard)

- New "Barcodes" tab listing the seller's products with an editable barcode field per product, plus "auto-generate" for blanks and duplicate detection.
- Barcode is stored per product; the POS scanner matches a scan against it first (falls back to name search).
- Dashboard tab buttons rearranged into two balanced rows on all screen sizes.

## 3. Stock sync + live badges

- Every successful POS checkout (and online checkout) decrements variant stock.
- Product tiles show real-time badges: "Out of stock" at 0, "Limited stock" at 5 or fewer, nothing when Unlimited Stock is on.
- Out-of-stock items is denotes out of stock to the POS cart unless unlimited.

## 4. Order validation & courier details

- Shipping orders require a customer address (blocking validation with inline error).
- Delivery charge applied automatically from the product rules (per-product charge, waived once the free-delivery quantity is reached).
- Courier name / tracking / notes captured at billing and saved on the order record.

## 5. Payment state on the POS cart tab

- Cart tab shows a clear payment status line: Paid (cash/UPI) vs "Pay later / pending", with the amount and method, and it is stamped on the invoice and the saved order.

## 6. Invoice preview + JPG download/share

- Preview screen after billing showing the rendered invoice before saving/sharing.
- Download as JPG and "Send to customer's WhatsApp" for both offline (POS) and online orders.

## 7. Automatic bill + thank-you delivery

- After payment success the bill image and a thank-you message are sent to the customer's WhatsApp automatically via the backend.
- If the WhatsApp send fails, an SMS fallback with the invoice link is sent, and the failure is logged so you can retry from the invoice preview.

## 8. Post-purchase rating & review per item

- After billing, a per-item rating (1-5) + comment form appears in the POS flow.
- Feedback is stored linked to the invoice/order and product, and shows on the product's reviews.

## Technical notes

- Migrations: add `barcode` to `products` (unique per seller, indexed); add `courier_name`, `courier_tracking`, `courier_notes`, `payment_state` to `orders`; new `pos_feedback` table (order_id, product_id, rating, comment) with seller-scoped policies and GRANTs; stock decrement handled in a security-definer function called at checkout.
- WhatsApp/SMS send: new edge function using the existing Twilio connection (WhatsApp media message with the JPG uploaded to the `order-bills` bucket, SMS fallback on failure). Automatic API sending needs a Twilio WhatsApp-enabled sender; if the send is rejected, the flow falls back to SMS plus the existing manual share link.
- POS component split into smaller files (products / cart / customer / invoice-preview / feedback) as part of the page move.