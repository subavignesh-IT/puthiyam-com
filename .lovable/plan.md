# POS Overhaul + Seller Login Alerts

## 1. POS: 3-Tab Structure (Product / Cart / Customer)

Replace the current 2-step wizard in `src/components/POSTab.tsx` with **three tabs**:

- **Product** — search, browse, scan and add items
- **Cart** — review selected items with fast qty controls
- **Customer** — customer details + payment

### Responsive behavior
- **Mobile (<768px)**: only one tab visible at a time, switch via top tab bar. Product tab is the entry point.
- **Desktop (≥768px)**: split view — Product on the left, Cart+Customer stacked on the right (both always visible). Tabs collapse into that layout.

```text
Mobile:                Desktop:
[Product|Cart|Cust]    ┌─────────┬──────────┐
┌─────────────────┐    │ Product │  Cart    │
│   active tab    │    │  (list) ├──────────┤
└─────────────────┘    │         │ Customer │
                       └─────────┴──────────┘
```

## 2. Product Tab Enhancements
- Product search (already exists) — keep and improve
- **Barcode/QR scan button** using `html5-qrcode` (camera-based). Scans a code → matches against `products.id` or SKU → auto-adds default variant to cart
- Tap product → adds to cart with default variant

## 3. Cart Tab Enhancements
- Fast quantity controls: `−` / `+` buttons + inline editable number input for each line item
- Trash icon to remove
- Live subtotal, delivery, wholesale tier hint

## 4. Customer Tab Enhancements
- **Customer search field** with typeahead against `pos_customers` — pick a match to autofill name / phone / address
- `+` icon still opens manual add
- Delivery override inputs
- Payment section: Cash / UPI / QR
- **Default UPI ID: `kathaiahkarthik@okhdfcbank`** used for the UPI intent link and QR image when the seller has no custom UPI configured
- Generate JPG bill on confirm (existing flow)

## 5. Seller Login WhatsApp Notification
- New edge function `supabase/functions/notify-seller-login/index.ts` that sends a WhatsApp message to `9361284773` via the existing Twilio setup, including seller name + ISO timestamp
- Trigger from `src/hooks/useAuth.tsx` `signIn()` after confirming the user has the `seller` role (check via `has_role` RPC). Fire-and-forget so login isn't blocked

## Technical Notes
- Add dependency: `html5-qrcode` for barcode scanning
- No DB schema changes required (POS uses existing `pos_customers`, `products`)
- Default UPI constant lives in `POSTab.tsx`; falls back to seller's profile UPI if set
- Notification function reuses existing Twilio secrets (`TWILIO_API_KEY`, `TWILIO_FROM_NUMBER`)
- Keep existing JPG invoice generation, wholesale logic, and 2→3 tab data flow intact
