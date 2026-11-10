# AGENTS.md — Softwallet

Instructions for AI coding agents (Claude Code, Cursor, Copilot Workspace, etc.) working in this repository. Read this file in full before making changes. If something here conflicts with a prompt you were given, treat this file as the higher-authority source for how this codebase should be built — it encodes decisions made deliberately after stress-testing the requirements, not defaults.

> **Status note:** This file is complete through Section 9 (as of the Phase 1 development scope). If you're reading this during a later phase of the project and find a convention that isn't covered here, that's a gap to fix by extending this file — not a signal that no convention applies.

---

## 1. What this project is

Softwallet is a consumer electronics e-commerce platform and lightweight inventory/admin system for a Computer Village (Ikeja, Lagos) retailer selling new and UK-used phones, laptops, gaming hardware, audio, and accessories. It is **not** a general-purpose e-commerce template — the two things that make this codebase different from a typical storefront, and that every agent must keep in mind:

1. **Serialized inventory.** Most products (phones, laptops, consoles) are tracked as individual physical units by IMEI/serial number, not just a quantity counter. This applies to both new and UK-used stock — do not assume serialization is only for used devices.
2. **Dual sales channels writing to the same inventory.** Devices are sold both online (this app) and in-person at the physical store (recorded through the same app's admin). Both paths must use the same locking/reservation mechanics — see Phase 2 of this file for the concurrency rules once added.

The full functional specification lives in `Softwallet_PRD.md` (engineering PRD) and `Softwallet_UI_UX_Design_PRD.md` (design PRD) in the project root. This file does not repeat that spec — it exists to translate the parts of it that matter most for how code gets written, into direct instructions.

## 2. Tech stack

Do not introduce alternatives to these without an explicit instruction to do so — the PRD deliberately scoped this stack to avoid unnecessary infrastructure:

- **Frontend:** Next.js (App Router), TypeScript
- **UI:** Tailwind CSS, shadcn/ui, lucide-react
- **Backend/data:** Supabase — PostgreSQL, Supabase Auth, Supabase Storage, Row Level Security (RLS)
- **Payments:** Paystack
- **Hosting/deployment:** Netlify (Next.js Runtime)

No microservices, no separate backend server, no external inventory/POS system, no Firebase, no MongoDB. If a task seems to need one of these, stop and flag it rather than adding it — this is very likely a sign the task should be solved differently within the existing architecture, not a genuine gap in the stack.

## 3. Setup & commands

Verified against the scaffolded `package.json`. The Supabase CLI is a local dev dependency (`npx supabase`); the same migration files apply to local Docker (`db reset`) or a hosted project (`db push`).

```bash
# Install dependencies
npm install

# Local development server
npm run dev

# Production build (run this before considering any task "done"
# if it touches routing, data fetching, or build-time config)
npm run build

# Lint
npm run lint

# Type-check
npm run type-check

# Supabase (local Docker or hosted — migrations are plain SQL)
npx supabase start
npx supabase db reset      # re-applies migrations + seed data
npx supabase db push       # apply migrations to a linked hosted project
npx supabase migration new <name>   # create a new migration file
npx supabase test db       # pgTAP tests in supabase/tests/
```

**Environment variables** (do not commit real values; confirm `.env.example` stays in sync with whatever the app actually reads):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=           # app origin used for staff invitation redirects
SUPABASE_SERVICE_ROLE_KEY=      # server-only — never expose to the client, never prefix with NEXT_PUBLIC_
PAYSTACK_SECRET_KEY=            # server-only
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
```

If a task requires an environment variable that isn't listed here, add it to this section and to `.env.example` in the same change — don't let this list silently go stale.

---

## 4. Critical business rules & invariants

**These are not style preferences. Violating any rule in this section can cause direct financial loss (overselling, duplicate charges) or a security breach (data leaking across customers). If a task seems to require breaking one of these rules, stop and ask rather than proceeding — the rule is more likely to be right than the task description.**

### 4.1 Inventory concurrency — never let the same unit sell twice

- Every individually tracked device (`inventory_items`) has a `status`: `available | reserved | sold | damaged | returned | trade_in_pending | removed`. A unit may only move to `reserved` or `sold` from `available`. Enforce this with a real database check, not just application logic that "should" prevent it.
- **Any code path that reserves or sells a specific `inventory_item` (online checkout reservation, webhook-triggered fulfillment, or the in-store `recordPhysicalSale` action) must acquire a row lock on that item before checking/changing its status** — e.g. `SELECT ... FOR UPDATE` inside a transaction. Do this even if the calling code "shouldn't" race with anything else. Two customers checking out the same IMEI simultaneously, or a physical-store sale racing an online reservation, are the exact scenarios this exists to prevent.
- Never write an inventory status change as a bare `UPDATE` from application code without first locking and re-checking the current status inside the same transaction.
- For non-serialized (quantity-based) variants, decrement/increment `quantity` with the same locking discipline — a plain `UPDATE ... SET quantity = quantity - 1` without a preceding lock + check is a race condition, not a shortcut.
- Every inventory-affecting action must write one row to `inventory_movements` (previous quantity, change, new quantity, reason, actor, reference). If you write code that changes stock without a corresponding movement row, that code is incomplete, not "fine for now."

- Online checkout uses `checkout_holds` leases while physical units remain `available`. Both online and physical sales must respect active holds under row locks. Verified payment consumes the order's own hold and transitions its unit directly from `available` to `sold`; `reserved` to `sold` is prohibited. Late payments after hold expiry must enter payment review, never take another customer's stock.

### 4.2 Payment idempotency — a webhook or request may arrive more than once

- Paystack webhooks **will** be delivered more than once for the same event in normal operation. Any webhook handler must be safe to run twice with no additional effect the second time.
- Pattern to follow: before applying a fulfillment (mark payment paid → mark order paid → finalize inventory → write movement), check the current payment status inside the same transaction. If it's already `paid`/terminal, acknowledge and return — do not re-run the fulfillment side effects.
- Never mark an order/payment as paid based on a client-side redirect or URL parameter. The only valid sources of truth for "payment succeeded" are (a) a signature-verified Paystack webhook, or (b) a server-side call to Paystack's verify-transaction API. If you find yourself writing `if (searchParams.get('status') === 'success')` anywhere near fulfillment logic, that's a bug.
- Every webhook handler must verify the Paystack signature before touching the database. Reject unsigned/invalid payloads outright — do not process "just to see."
- Fulfillment (payment status + order status + inventory finalization) happens inside a single database transaction. Do not split it across multiple round-trips where a crash between them could leave payment marked `paid` but inventory not decremented, or vice versa.
- `orders.idempotency_key` and `payments.paystack_reference` are unique constraints, not just useful fields — do not write code that could plausibly generate a duplicate of either.

### 4.3 Pricing — the server is the only source of truth

- Cart/checkout totals (price, quantity, discount, delivery fee, final amount) must always be computed server-side from the live database at the moment of checkout, never trusted from client-submitted values.
- When initializing a Paystack transaction, the amount sent must come from the server-side calculation, never from a request body field the client controls.
- If a UI component displays a price, that's for display only — it is never itself the source the server uses to charge someone. Do not "optimize" by trusting a price the client already has cached.

### 4.4 Row Level Security — the database enforces access, not just the UI

- Every table containing customer or business-sensitive data must have RLS enabled with policies matching the role table in the PRD (§24) — do not ship a table with RLS disabled "temporarily."
- Privileged mutations (inventory changes, order status changes, price changes, role assignment) happen through server actions using the Supabase **service role**, with authorization checked in code — not through direct client-side Supabase calls using the anon/user key, even for an admin-only UI. A hidden button is not a security boundary.
- When adding a new table, adding RLS policies for it is part of the same change, not a follow-up task. A migration that creates a table without also adding its RLS policy is incomplete.
- Never assume "the UI doesn't expose this" is sufficient protection for an API route or server action. Assume every server action will eventually be called directly with crafted input, and check auth/role/ownership inside the action itself.

---

## 5. Database & schema conventions

- **Primary keys:** `uuid`, generated with `gen_random_uuid()`. Do not use serial/bigint IDs for new tables — the PRD's schema is uuid-based throughout, and mixing key types across tables creates avoidable friction in joins and RLS policies.
- **Timestamps:** every table gets `created_at timestamptz default now()`. Add `updated_at timestamptz` (kept current via a trigger, not hand-maintained in application code) on tables that are actually mutated after creation. Append-only tables (`inventory_movements`, `audit_logs`, `payments`) don't need `updated_at` — they're never updated, only inserted.
- **Soft delete vs. hard delete:** only `products` and `categories` use soft delete (`deleted_at timestamptz`, nullable). Transactional/history tables (`orders`, `inventory_movements`, `audit_logs`) are never deleted, soft or hard — don't add a `deleted_at` column to these out of habit.
- **Naming:** tables are plural, snake_case (`inventory_items`, not `InventoryItem` or `inventory_item`). Columns are snake_case. Foreign key columns are named `<singular_table>_id` (`variant_id`, `order_id`) — not `fk_variant` or similar.
- **Money is stored as an integer, in the smallest currency unit (kobo), never as a float or decimal.** `total_amount`, `price`, `unit_price`, etc. are all `integer` (kobo), not `numeric`/`float`. Convert to Naira only at the display layer. This avoids floating-point rounding errors in a system where getting a total wrong is a real financial bug, not a cosmetic one. If you find a money column typed as `numeric` or `float`, that's a defect to flag, not a pattern to copy.
- **Indexes:** every foreign key column gets an index unless there's a specific reason not to. The hot-path indexes called out in the PRD — `(variant_id, status)` on `inventory_items`, partial unique indexes on `imei`/`serial_number` (`WHERE imei IS NOT NULL`) — are not optional extras, they're part of the correctness guarantees in Section 4.1 above, not just a performance nicety.
- **Migrations:** one logical change per migration file (`npx supabase migration new <descriptive_name>`). Never hand-edit a migration that has already been applied to any shared environment — write a new migration that changes it forward. Every new table ships with its RLS policies in the same migration, per Section 4.4.
- **Constraints belong in the database, not just in application code.** If the PRD or this file states a business rule ("IMEI must be unique where present," "an order total must be non-negative"), prefer a `CHECK` constraint or unique index over relying solely on a Zod schema or an `if` statement in a server action. Application-level validation is still expected too — it's a better user experience — but it is not a substitute for the database-level guarantee.

## 6. Coding style & conventions

- **TypeScript strict mode is on. Avoid `any`** — if a type is genuinely unknown (e.g. a third-party webhook payload before validation), type it as `unknown` and narrow it, don't reach for `any` to make an error go away.
- **Server Actions are the default for mutations** (creating an order, recording a sale, updating inventory). Reach for a Route Handler (`app/api/.../route.ts`) specifically when you need a stable HTTP endpoint for something outside a form/component interaction — the Paystack webhook receiver is the clearest example, since Paystack calls it directly, not through a form submission.
- **File/folder structure** follows Next.js App Router conventions: route segments under `app/`, shared UI in `components/` (with shadcn/ui primitives kept in `components/ui/` untouched from their generated form — customize by composition, not by editing the generated files), shared logic in `lib/` (`lib/supabase/`, `lib/paystack/`, `lib/validations/`), and types in `types/` or colocated with their domain.
- **Components:** PascalCase filenames and component names (`ProductCard.tsx`), camelCase for functions/variables/hooks. Server Components by default; add `"use client"` only where interactivity actually requires it (form state, event handlers, browser APIs) — don't default to client components out of habit, since it works against the server-rendering/SEO goals in the PRD.
- **Styling:** Tailwind utility classes, following the design tokens from the UI/UX Design PRD and Figma handoff spec (color names, spacing scale) rather than arbitrary one-off values (`text-[#2D5FD2]` should be a named token, not a magic string repeated across files). Avoid inline `style={{}}` except for genuinely dynamic, computed values (e.g. a progress-bar width driven by a battery-health percentage).
- **Error handling in Server Actions:** return a typed result (`{ success: true, data } | { success: false, error }`), don't throw raw errors across the server/client boundary. The client should always get something it can render a meaningful message from, not a generic "something went wrong."
- **Comments:** explain *why*, not *what* — especially around the invariants in Section 4. A comment like `// lock this row before checking status — prevents double-sale race, see AGENTS.md §4.1` is worth writing; a comment restating what the next line of code obviously does is not.
- **Don't introduce a new dependency for something the existing stack already does.** Before adding a package, check whether Supabase, Tailwind, shadcn/ui, or a Next.js built-in already covers the need — the PRD's stack was deliberately scoped to avoid exactly this kind of creep.

---

## 7. Testing requirements

- **The edge cases in the PRD (§32) are not optional test coverage — they are the actual spec for this system's correctness.** Before considering any change to checkout, payment, or inventory code complete, check it against the relevant rows in that table: double-clicked pay, webhook delivered twice, two customers racing the same IMEI, a physical sale racing an online reservation, payment amount mismatch, price changing mid-checkout. If a change touches this code and doesn't at least consider these scenarios, treat the change as unfinished.
- **Concurrency tests for Section 4.1 and 4.2 are the highest-priority tests in this codebase.** A test suite that covers happy-path checkout but never simulates two simultaneous requests for the same inventory item, or the same webhook delivered twice, has not actually tested the thing that matters most here. Prefer integration tests that hit a real (local/test) Postgres instance for this — a mocked database can't catch a real row-locking bug.
- **RLS policies are tested per role, not assumed correct because "the policy looks right."** When adding or changing a policy, write a test that authenticates as each relevant role (customer, `sales_staff`, `inventory_manager`, `order_manager`, `super_admin`) and confirms both what they *can* and what they explicitly *cannot* do. A policy that's too permissive is a data breach, not a minor bug — test the negative case, not just the positive one.
- **Never run tests against the production Supabase project or a real Paystack live key.** Use a local Supabase instance (`npx supabase start`) or a dedicated Supabase test project, and Paystack's test-mode keys, for all automated tests and local development.
- Unit tests for pure logic (price calculation, discount application, delivery-fee lookup) are expected but are not a substitute for the integration/concurrency tests above — this codebase's riskiest bugs live in concurrent database interactions, not in isolated functions.

## 8. Commit & PR conventions

- **Commit messages:** conventional-commits style — `feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:` prefix, short imperative summary. E.g. `fix: lock inventory_items row before reservation to prevent double-sale`.
- **A PR touching anything in Section 4 (inventory locking, payment idempotency, pricing, RLS) must say so explicitly in the PR description** — name which invariant it touches and how the change was verified against it. Reviewers should be able to find this without reading the full diff first.
- **A migration that adds or changes a table must have its RLS policy changes called out explicitly in the same PR description**, even if the policy file is technically a separate diff hunk — don't make a reviewer go hunting for whether RLS was considered.
- **Branch naming:** `feature/<short-description>`, `fix/<short-description>` — nothing enforced strictly here, but keep it descriptive enough that the branch name alone tells a reviewer what to expect.
- Keep PRs scoped to one logical change. A PR that mixes an inventory-locking fix with an unrelated UI tweak makes the risky part harder to review carefully — split them.

## 9. Explicit "do not" list

A consolidated, scannable version of the hardest rules in this file — most are explained in more detail above, but worth having in one place:

- Do **not** update an `inventory_items` status without a row lock (`SELECT ... FOR UPDATE`) inside a transaction.
- Do **not** mark a payment/order as paid based on a client-side redirect or query parameter — only a verified webhook or server-side Paystack verify call.
- Do **not** process a webhook without verifying its signature first.
- Do **not** trust a price, total, or discount amount sent from the client — always recompute server-side.
- Do **not** ship a new table without RLS policies in the same migration.
- Do **not** perform a privileged mutation (inventory, order status, pricing, roles) through a client-side Supabase call using the anon key — use a server action with the service role and explicit authorization checks.
- Do **not** store money as `float`/`numeric` — integer kobo only.
- Do **not** hand-edit a migration that has already been applied anywhere shared.
- Do **not** disable or weaken an RLS policy to "quickly fix" a bug — find the correct policy instead; a disabled policy is a data leak, not a fix.
- Do **not** commit secrets, real API keys, or `.env` files with real values.
- Do **not** add a new dependency, service, or piece of infrastructure not already listed in Section 2 without flagging it first — the stack was deliberately scoped, and scope creep here defeats that.
- Do **not** treat the edge cases in PRD §32 as optional — code touching checkout/payment/inventory is not done until it's been considered against them.

---

**This file is now complete through Section 9, covering everything currently scoped for Phase 1 of development.** As Phase 2 onward (storefront UI, cart/checkout, admin catalogue, trade-ins if reactivated, etc.) introduces new patterns, extend this file rather than letting new conventions live only in people's heads or in scattered PR comments — an agent reading this file six months from now should still be able to trust that it reflects how the codebase actually works.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
