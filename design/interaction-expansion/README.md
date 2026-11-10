# Softwallet interaction expansion

This package adds editable customer journeys and an admin workspace to the existing Softwallet Figma file. It does not change the application, original prototype, plan, database, or live business data.

## Scope

- Customer: discovery, search/filter/sort, product variants and condition information, cart changes, account creation and authentication, address management, delivery, discounts, checkout, verified/pending/failed payments, order tracking, reviews, and support.
- Admin: Dashboard, Products, Categories, Brands, Inventory, Inventory movements, Record sale, Orders, Customers, Discounts, Reviews, Delivery, Staff & roles, Audit log, and Settings.
- Dedicated validation, loading, empty, success, cancellation, confirmation, permission, conflict, and retry states.
- Separate handling for serialized units and quantity stock; reserved-stock conflicts; duplicate IMEIs; physical-sale uncertainty; payment verification and amount mismatches; last-super-admin protection.

The screen inventory is the definitive list. The importer generates both desktop and mobile customer screens, desktop admin states, and mobile admin entry/form/shared recovery screens.

## Review

Open `review.html` for a local, interactive content preview. Select a screen, follow its actions, or use the alternate-outcome buttons below the preview. This preview illustrates the new content; the Figma importer additionally clones the original home and product designs.

The Figma pages are `02 / Customer journeys` and `03 / Admin workspace`. Each begins with a flow index. Within a section, read left to right, then continue on the next row. Notes and alternate-outcome controls sit outside the product screens.

## Rebuild

1. Edit `scenarios.cjs` for content and destinations, or `figma-builder.js` for native Figma layout.
2. Run `node design/interaction-expansion/build.cjs` and `node design/interaction-expansion/preview.cjs` from the project root.
3. In Figma desktop, use Plugins → Development → Import plugin from manifest, selecting this folder’s `manifest.json`.
4. Run **Softwallet — Complete UI Flows** and build the relevant area.

The importer has no network access. Existing generated frames are reused on retry; it does not overwrite original designs. Re-running after changing a completed generated screen requires a targeted update, not a blind rebuild.

## Design assumptions

The missing engineering and design PRDs were not available in this workspace. Grading definitions, warranty and return eligibility, support response times, exact role permissions, and optional notification/service-request features require retailer approval before implementation. Examples use synthetic contact details and identifiers.

Google and Paystack screens represent external handoffs, not credential collection. “Verified success” is a review branch; a real application must transition only on verified server evidence. Refund screens request review and do not claim a refund has been completed. Export and receipt views are design states rather than live file-generation services.
