# Customer flow setup and verification

## Implemented routes

- `/shop`: published catalogue, search, filters and pagination.
- `/shop/[slug]`: product photos, variants, prices and stock-checked basket additions.
- `/cart`: persistent guest basket with live price and stock checks.
- `/account/register`, `/account/sign-in`, `/auth/recover`: authentication and password recovery.
- `/account/addresses`: add, edit and remove owned delivery addresses. Orders retain a snapshot of the address at checkout.
- `/checkout`: address and delivery selection, discount submission, server-calculated final total review, then Paystack payment.
- `/checkout/status`: server verification on return, manual retry and cancellation of unpaid orders.
- `/account/orders`: owned order history and receipts; fulfilled orders accept reviews for moderation.
- `/account/help`: support requests and staff responses. Staff respond at `/admin/support`.

## Before payment acceptance testing

1. Add Paystack **test** credentials to the ignored `.env.local`; never put secrets in source or chat. `PAYSTACK_SECRET_KEY` is used server-side for hosted checkout initialization and verification. The public key is not needed for this hosted redirect integration.
2. Set `NEXT_PUBLIC_SITE_URL` to the app origin. In Supabase Auth, allow that origin's `/auth/callback` and `/auth/set-password` URLs. Use the same browser to request and open recovery links.
3. For deployed webhook testing, configure Paystack's webhook URL to the public HTTPS origin plus `/api/paystack/webhook`. Paystack cannot call localhost. Server verification can still check a locally initiated payment.
4. Use an isolated Supabase test project for checkout tests. Add published products, variant prices, photos, inventory and active delivery zones through admin. Do not add test orders to production.
5. Register a test customer, add an address, add an available item to the basket, review the final total, pay with Paystack test mode and check the receipt.

Payment provider requests have not been exercised: credentials were deferred by the project owner. No paid result is inferred from a browser URL. A verified webhook or server verification must match the stored reference, NGN currency and integer-kobo amount.

## Inventory and recovery

Checkout holds last 20 minutes and are separate from physical inventory status. Active holds block online and physical sale races. Verified payment changes available units directly to sold inside one transaction. Late payment enters manual payment review without taking stock. Cancellation releases the order's holds. Expired holds no longer reduce availability; automated archival and movement recording for expired holds remain outstanding.

Unpaid orders remain accessible from the customer's order history. A customer can retry payment while the hold is valid or cancel and start again. Totals below NGN 1 require support rather than sending an unsupported amount to Paystack.

## Checks

Run `npm run lint`, `npm run type-check` and `npm run build`. SQL tests are under `supabase/tests`; run them only on local or dedicated test Supabase. `scripts/test-checkout-concurrency.py` targets the isolated Docker container `supabase_db_softwallet_admin_test` and creates test fixtures there. It tests a physical-sale/checkout race and duplicate simultaneous fulfillment.

Current remaining work before claiming complete design coverage: exact UK-used unit selection with per-unit condition information, automated expired-hold cleanup, richer shipment tracking and return attachments. Real-provider payment acceptance testing also remains pending.
