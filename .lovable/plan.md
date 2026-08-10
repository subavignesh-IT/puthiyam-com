# Seller Platform: Approvals, Batches, Bills, POS & Imports

Verified in the project: the `product_batches`, `bill_designs`, `pos_customers` tables and the `payment_state` order column already exist in the database but no frontend code references them yet. `profiles` has company name, GSTIN, address, city, pincode, UPI ID — but no bank account, Aadhaar or PAN columns.

## 1. Access gating
- Seller Dashboard, POS and customer tabs check role + approval status on load: approved seller or admin only. Pending or rejected sellers see a clear status screen instead of a blank/denied page.
- Admin dashboard keeps Approve/Reject; approval copies company details onto the seller profile.

## 2. Seller identity (signup + profile)
- Seller signup and the seller profile editor collect: full name, business name, address, city, pincode, GSTIN, bank account number, UPI ID, Aadhaar number, PAN number.
- Sensitive numbers stay readable only by the seller themselves and admins.

## 3. Customer tabs (split)
- "Online Customers" tab: registered app buyers, read-only, with purchase history.
- "Offline Customers" tab: seller-managed list with add, edit and remove.
- Matching phone numbers show combined history across both.

## 4. Bill management tab
- Design editor: template presets, header/table/totals colours, font family and size, logo, business details, terms and conditions, footer note.
- Toggles for GSTIN, HSN, batch, MFD/EXP, delivery details, signature, loyalty card block, UPI QR (with UPI ID).
- Live preview, multiple saved designs, one default. All bill rendering (POS + online) uses the default design.
- Bill image export at 1080p quality for download and WhatsApp.
- Loyalty card details (stamps earned, reward progress) print on the bill.
- Deleting an order/bill removes it everywhere it is listed (orders tab, customer history, bill previews) and refreshes those views.

## 5. Batches with MFD/EXP
- Per product/variant batches: batch number, MFD date, EXP date, quantity, purchase price.
- Multiple purchase-price entries per product and per variant (each batch carries its own cost), with average cost and margin shown in the product form.
- POS sells oldest non-expired batch first; batch stock reduces and is logged.
- Barcode labels can be generated per batch and print batch no / MFD / EXP on the sticker.
- Delete button for any generated barcode (product, variant or batch level).

## 6. POS changes
- Payment method buttons: COD (cash) or Online.
- Payment status includes Partial: entering the amount received stores it and the bill prints "Balance to pay".
- Camera scanner stays open scanning continuously until "Done" is pressed; duplicate guard plus per-scan feedback.

## 7. Courier label
- A "Courier label" download button in every billing area (POS bill, orders tab, bill preview) generates a 1/4 A4 sticker:
  From PUTHIYAM, 9361284773, Paramakudi, Ramanathapuram - 623707 / To customer name, phone, address. AI cleans and formats the address into postal lines.

## 8. Orders tab
- Bill preview inline for each order, with print, PDF, image and courier-label actions.

## 9. Bulk product import (XLS)
- "Import products" uploads an .xlsx and creates products, variants and batches in one go, with a row-by-row validation report.
- "Download example sheet" produces a template with the exact expected columns.

## 10. UI polish
- Every dashboard tab button gets a distinct icon (no repeats).
- Small secondary text sizes bumped up across dashboard, POS and bills for readability.
- Every route scrolls to the top on navigation.

## Technical notes
- Migrations: add bank_account, aadhaar_number, pan_number to `profiles` and `seller_requests`; barcode/batch columns for batch-level codes; `partial_amount_received` on `orders`; wire `product_batches` and `bill_designs` into the app (tables already exist).
- New components: `BillDesignTab.tsx`, `BatchTab.tsx`, `OnlineCustomersTab.tsx`, `OfflineCustomersTab.tsx`, `ProductImportDialog.tsx`, `CourierLabel.tsx`.
- `src/lib/barcodeImage.ts` extended with batch text lines; `src/lib/pdf.ts` gains 1/4-A4 courier label and higher pixel ratio (1080p) export.
- `BarcodeScannerDialog.tsx` gets continuous mode; `POSBilling.tsx` gains keyboard-wedge capture for USB/Bluetooth scanners, COD/Online and Partial payment.
- XLSX handled with the `xlsx` library in the browser; example sheet generated client-side.
- Courier address formatting via an edge function using Lovable AI.

## Suggested order
1. Access gating + seller identity fields
2. Batches, multi purchase prices, barcode delete/batch labels
3. POS payment options, partial payment, continuous scanning
4. Bill design tab, loyalty on bill, 1080p export, cascade delete
5. Orders bill previews + courier label everywhere
6. XLS import + UI polish (icons, text sizes, scroll-to-top)
