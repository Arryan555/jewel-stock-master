# Workspace

## Overview

pnpm workspace monorepo for **Jewel Suite** — a complete jewellery management system for Indian jewellers. Covers retail/wholesale billing (6 bill types), Jewar Bill with fine mode & multiple payment modes, Girvi (gold/silver pawn loans), Karigar/job-card management, Issue Register, Au/Ag Rates, Cr/Dr ledger, Saving Schemes, Purchases, reports, Settings/AMC.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19 + Vite 7 + Wouter + TanStack Query + shadcn/ui + Recharts
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (React Query hooks + Zod) from OpenAPI 3.1 spec
- **Build**: esbuild (CJS bundle for API, Vite for frontend)

## Artifacts

- `artifacts/api-server` — Express API at `/api/*`
- `artifacts/jewel-suite` — React+Vite frontend (Jewel Suite)
- `artifacts/mockup-sandbox` — design preview server (canvas only)

## Design System

- Premium gold (`hsl(36 60% 45%)`) on ivory background, charcoal text
- Serif headings (`font-serif`), sans body
- Indian numbering: `formatCurrency` uses `en-IN` locale with ₹ symbol
- No emojis in UI; lucide-react icons only
- Cards `border-border/50 shadow-sm`; KPI accents `bg-primary/5`

## Domain Model

- **Customer** — retail/wholesale, openingBalance (positive = receivable Dr)
- **Product** — metal, purity, weightGrams, ratePerGram, makingChargePercent, gstRate
- **Invoice** — type=retail|wholesale|gold|diamond|exchange|repair, items[], discount, paidAmount, status auto-derived
- **GirviLoan** — collateral pledge, interestRatePerMonth, dueDate, payments[], outstanding
- **LedgerEntry** — credit/debit per customer with running balance
- **PurchaseVoucher** — buy gold/silver from vendors; items with grossWeight/lessWeight/fineWeight/rate; paidAmount tracks payment
- **AmcSettings** — singleton (id=1) for Annual Maintenance Contract tracking; warnBeforeDays triggers sidebar banner
- **Karigar** (simple profile) — craftsman with specialization, rateType, rate (used by Issue Register)
- **KarigarsTable** (full profile) — name, phone, speciality, address, notes + join to karigar_jobs
- **KarigarJob** — job card for workshop tracking: issuedWeight, receivedWeight, wastage, laborCharge, status
- **IssueRegister** — metal issued to karigar (gross/net/fine grams), return tracking
- **MetalRates** — daily Au/Ag rates (24K/22K/18K gold + silver), making/wastage %
- **InvoicePayments** — multi-mode payments per bill (Cash/UPI/NEFT/Card/Cheque/Credit/Gold/Silver)

## DB Schema Files

- `lib/db/src/schema/customers.ts`, `products.ts`, `invoices.ts`, `girvi.ts`, `ledger.ts`
- `lib/db/src/schema/karigar.ts` — simple karigar profile table
- `lib/db/src/schema/repairs.ts`, `estimates.ts`, `schemes.ts`, `settings.ts`, `purchases.ts`, `amc.ts`
- `lib/db/src/schema/issue_register.ts`, `metal_rates.ts`, `invoice_payments.ts`

## API Routes (artifacts/api-server/src/routes/)

- Core: `health.ts`, `customers.ts`, `products.ts`, `invoices.ts`, `girvi.ts`, `ledger.ts`, `reports.ts`
- `karigar.ts` — Full karigar CRUD (GET/POST/PUT/DELETE /karigars) + karigar-jobs endpoints + simple /karigar CRUD
- `repairs.ts`, `estimates.ts`, `schemes.ts`, `settings.ts`, `purchases.ts`, `amc.ts`
- `issue.ts` — Issue register (GET/POST/PATCH(return)/DELETE /issue, GET /issue/next-number)
- `rates.ts` — Metal rates (GET/POST /rates, GET /rates/today)

## Frontend Pages

| Path | Page |
|------|------|
| `/` | Dashboard |
| `/billing/retail/new` | Jewar Bill (Retail Sale) |
| `/billing/wholesale/new` | Jewar Bill (Wholesale) |
| `/billing/gold/new` | Jewar Bill (Gold) |
| `/billing/diamond/new` | Jewar Bill (Diamond) |
| `/billing/exchange/new` | Jewar Bill (Exchange) |
| `/billing/repair/new` | Jewar Bill (Repair) |
| `/invoices` | All Invoices |
| `/invoices/:id` | Invoice Detail |
| `/estimates` | Estimates |
| `/issue` | Issue Register |
| `/karigar` | Karigar (simple profiles) |
| `/karigars` | Karigars (full, with job stats) |
| `/karigar-jobs` | Karigar Job Cards |
| `/repairs` | Repairs |
| `/girvi` | Girvi Loans |
| `/purchases` | Purchase Vouchers |
| `/schemes` | Saving Schemes |
| `/ledger` | Cr/Dr Ledger |
| `/products` | Stock |
| `/customers` | Customers |
| `/rates` | Au/Ag Rates |
| `/settings` | Settings & AMC (combined) |
| `/amc` | AMC (dedicated page) |
| `/reports/daybook` | Daybook |
| `/reports/sales` | Sales Report |
| `/reports/gst` | GST Report |
| `/reports/stock` | Stock Report |
| `/reports/girvi` | Girvi Report |

## Jewar Bill Features

- 6 bill types: Retail Sale (JB-), Wholesale (WS-), Gold (GD-), Diamond (DM-), Exchange (EX-), Repair (RP-)
- Columns: #, Item Name, Metal, Purity, Gross(g), Less(g), Net(g), Fine(g) [when fine mode ON], Making (value + %/₹g/₹pc), Rate/g ₹, Amount ₹
- Fine Mode toggle: rate applied on fine (purity-adjusted) grams
- Purity factors: 24K=1, 22K=22/24, 18K=18/24, 14K=14/24, 925=0.925, 999=0.999
- Payment modes: Cash, UPI, NEFT/RTGS, Card, Cheque, Credit, Gold Payment (grams), Silver Payment (grams)
- 3-way balance: Cash Balance ₹, Gold Balance (g), Silver Balance (g)

## Settings/AMC

- Combined page at `/settings`: backend-persisted shop identity + localStorage AMC panel
- AMC days-remaining counter with green/amber/red status and progress bar
- Quick plan buttons: 3 Months, 6 Months, 1 Year, 2 Years
- Sidebar banner auto-shows when AMC is expiring soon or expired (via `useGetAmcSettings`)
- Dedicated `/amc` page for full AMC management

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/api-server run seed` — seed DB with sample data

## Codegen Workflow

When changing the API contract:
1. Edit `lib/api-spec/openapi.yaml` (paths, schemas)
2. Run `pnpm --filter @workspace/api-spec run codegen` — produces `lib/api-client-react/src/generated/api.ts` (React Query hooks) and `lib/api-zod/src/generated/*` (Zod schemas)
3. Update server route handlers in `artifacts/api-server/src/routes/*.ts`
4. Restart `artifacts/api-server: API Server` workflow (build is one-shot, not watched)

## Frontend Conventions

- All routes in `artifacts/jewel-suite/src/App.tsx` under a `WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}`
- Page components in `src/pages/<area>/(index|detail|new).tsx`
- Reusable forms in `src/components/forms/*-dialog.tsx`
- Number/date helpers in `src/lib/format.ts`; invoice row math in `src/lib/calc.ts`
- Hook pattern for `useGetX(id)`: `useGetX(id, { query: { enabled: !!id, queryKey: getGetXQueryKey(id) } })`
- New API routes (issue/rates) use direct `fetch` + TanStack Query — no codegen needed

## Important Operational Notes

- The API server's dev script is `build && start` (no watcher). After editing server code, **always restart** `artifacts/api-server: API Server`.
- Numeric DB columns are returned as strings server-side; the api-zod schemas convert to numbers, so the client always works with numbers.
- Ledger sign convention: positive balance = customer owes us = **Receivable (Dr)**; negative = **Payable (Cr)**.
- Customer-detail/girvi-detail use `if (!entity) return` guards before any closure that touches the entity (TS narrowing doesn't carry into closures).
- AMC localStorage keys: `jewel-amc-settings`. Backend AMC is also tracked via the `amc` table (singleton id=1).

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
