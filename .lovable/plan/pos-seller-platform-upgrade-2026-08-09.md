# POS & Seller Platform Upgrade

## 1. Fix seller login and signup (first priority)

Confirmed in the database: the seller requests table is completely empty, and only two accounts have any role at all (one seller, one admin). So no seller request ever reaches the admin, nothing can be approved, and every new seller hits "Access Denied" at login.

The seller signup writes the request immediately after sign-up, while the account is still unconfirmed and there is no active session, so the insert is rejected and the failure is only logged to the console.

Fixes:

- Write the seller request through a server-side function so it always lands, even before email confirmation, and show the real error to the user instead of swallowing it.
- Add required company details to seller signup: shop/company name, GSTIN (optional), business address, city/district, pincode. Stored on the request and copied to the seller profile on approval.
- Admin dashboard gets a searchable seller requests list (name, shop, phone, email) with Approve / Reject. Approve grants the seller role and marks the request approved.
- Seller login: clear status message (pending / rejected / not registered) with a link to register, and approved sellers route straight to the dashboard.
- Sellers and admins get an access-control panel to grant or revoke user access for allowed users.

## 2. Product form additions

- Purchase price input per product/variant, with live calculated profit, margin %, and GST-inclusive/exclusive selling price derived automatically from purchase price + GST rate.
- "Default variant" selector so the seller chooses which variant's price shows on the home page and product cards.

## 3. Home page

- Product cards show the chosen default variant.
- A "More products" section at the bottom of the selected-product view.

## 4. Batches (MFD / EXP) with per-batch stock

- New batches table per product variant: batch number, MFD date, EXP date, quantity, purchase price.
- POS sells from the oldest non-expired batch first; batch stock reduces on each sale and is recorded in the stock log.
- Expiring/expired batch alerts on the seller dashboard.
- Batch details (batch no, MFD, EXP) print on the barcode label.

## 5. Barcode upgrades

- Barcode generation uses batch + product name + company name, and the seller sets the code length before generating.
- Label print sheet: choose which labels to print and how many copies each (e.g. label 1 x 5, label 3 x 3), then lay them out on A4.
- Status badge shows Pending for a newly generated code and Assigned once saved.

## 6. POS scanning

- Camera scanner stays open after a detection so multiple products can be scanned in a row, with feedback and a duplicate guard.
- Accept USB and Bluetooth laser scanners by capturing keyboard-wedge input (fast keystrokes ending in Enter) anywhere in the POS.

## 7. Bill management tab (new seller dashboard tab)

Both preset templates and full customisation:

- Templates to start from, then per-section control: colours (header, table, totals), font family and size, logo, business details.
- Terms & conditions text, footer note, UPI QR toggle and UPI ID, loyalty card block, and toggles for which fields appear (GSTIN, HSN, batch, MFD/EXP, delivery details, signature).
- Live preview, multiple saved designs, one marked default.
- Bill images export at 1080p quality (higher pixel ratio) for WhatsApp and downloads.

## 8. Delivery details on bills

For home-delivery orders (POS and online), the bill shows:

and it is downloadable in a size of 1/4 A4 sheet to stick on the courier boxes when the courier details button is clicked 

```text
From: PUTHIYAM, 9361284773
      Paramakudi, Ramanathapuram - 623707
To:   <customer name, phone, address>
```

## 9. Customer tabs

Two separate tabs on the seller dashboard:

- Online customers - registered app buyers (read-only).
- Offline customers - POS customers the seller adds, edits and removes manually.
Where a phone number matches across both, the combined purchase history is shown.

## Technical notes

- Migrations: product_batches table (variant, batch_no, mfd, exp, qty, purchase price) with grants + seller-scoped RLS; bill_designs table for bill customisation; extra company columns on seller_requests and profiles; a barcode status column; batch-aware update to decrement_variant_stock so batch consumption is logged in stock_audit_log.
- Seller request insert moves into an edge function using the service role, so it works pre-confirmation.
- Barcode label rendering extends src/lib/barcodeImage.ts with per-label copy counts and batch text lines.
- Bill rendering (InvoiceBill.tsx) reads the active bill design; export helpers in src/lib/pdf.ts bump pixel ratio for 1080p output.
- POS keyboard-wedge listener lives in POSBilling.tsx; BarcodeScannerDialog.tsx gains a continuous mode.

## Suggested order

1. Seller login/signup fix + company details + admin approval + access control
2. Product form (purchase price, margins, default variant) and home page changes
3. Batches + barcode generation/status/copies
4. POS scanning (continuous + laser input)
5. Bill management tab, delivery details, 1080p export
6. Customer tabs split