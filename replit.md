# Workspace

## Overview

pnpm workspace monorepo for **Jewel Suite** — a stylish jewellery management web app for Indian jewellers covering retail/wholesale billing, GST invoicing, Girvi (gold/silver pawn loans), Cr/Dr ledger, and reports.

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
- **Invoice** — type=retail|wholesale, items[], discount, paidAmount, status auto-derived
- **GirviLoan** — collateral pledge, interestRatePerMonth, dueDate, payments[], outstanding
- **LedgerEntry** — credit/debit per customer with running balance
- **PurchaseVoucher** — buy gold/silver from vendors; items with grossWeight/lessWeight/fineWeight/rate; paidAmount tracks payment; status computed (paid/partial/unpaid)
- **AmcSettings** — singleton (id=1) for Annual Maintenance Contract tracking; warnBeforeDays triggers sidebar banner when expiring soon

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/api-server run seed` — seed DB with sample data (uses tsx)

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
- Mutations: `useCreate/Update/Delete<Entity>` and `useRecord<...>Payment`/`useCloseGirviLoan`

## Important Operational Notes

- The API server's dev script is `build && start` (no watcher). After editing server code, **always restart** `artifacts/api-server: API Server`.
- Numeric DB columns are returned as strings server-side; the api-zod schemas convert to numbers, so the client always works with numbers.
- Ledger sign convention: positive balance = customer owes us = **Receivable (Dr)**; negative = **Payable (Cr)**.
- Customer-detail/girvi-detail use `if (!entity) return` guards before any closure that touches the entity (TS narrowing doesn't carry into closures).

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
