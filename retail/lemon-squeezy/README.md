# FieldOps Pro retail package

This folder contains the customer-facing material for the existing Lemon Squeezy FieldOps Pro product.

## Current commercial identity

| Field | Value |
| --- | --- |
| Store | DaemonCore / `230368` |
| Product name | DaemonCore FieldOps Pro |
| Variant | One-Time License / 1 Active Device |
| Variant ID | `2062439` |
| Price | `$199 USD` one time |
| Checkout | `https://daemoncore.lemonsqueezy.com/checkout/buy/17b86570-b95c-49fa-a987-e8fa904d3f34` |
| Free product | DaemonCore Academy |
| Paid entitlement | FieldOps Pro |

`CHECKOUT-CONFIG.json` is the source-of-truth checklist for Lemon Squeezy. `PRODUCT-LISTING.md` contains ready-to-paste storefront copy. `FULFILLMENT.md` contains receipt, activation, support, and buyer FAQ language.

Upload `fieldops-pro-checkout-cover.png` as the product image. It is a square 1254 x 1254 PNG designed to remain legible in the checkout thumbnail. `IMAGE-PROMPT.md` preserves the exact generation brief for future brand-consistent variants.

## Retail promise

The purchase unlocks the FieldOps workspace inside the free DaemonCore Academy desktop application. It does not sell authorization to test a target, promise unrestricted execution, or include a professional certification. Those boundaries should remain visible anywhere the product is sold.

## Before publishing

1. Confirm the Lemon Squeezy variant ID is `2062439` and license keys are enabled.
2. Set one active device unless a separate multi-device variant is intentionally created.
3. Keep the license duration unlimited for the one-time offer.
4. Paste the short and full descriptions from `PRODUCT-LISTING.md`.
5. Add the post-purchase message and receipt email from `FULFILLMENT.md`.
6. Link the EULA, support page, installer, and checksum.
7. Complete a real test-mode purchase, activation, validation, deactivation, and second-device activation before sending paid traffic.

Do not place a Lemon Squeezy API key, webhook secret, customer license key, or signing credential in this folder or the desktop application.
