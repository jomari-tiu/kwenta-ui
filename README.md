# financial-tracker-web

Vite + React SPA for a single-user personal finance tracker.

Companion repo: `../financial-tracker-api` (Express + Drizzle + Postgres).
Two standalone repos on purpose — they are meant to deploy to different
platforms. Nothing is deployed yet.

## Local setup

Start the API first (see its README), then:

```bash
cp .env.example .env.local     # VITE_API_URL=http://localhost:8000
npm install
npm run dev                    # http://localhost:5173
```

The dev server binds all interfaces, so the printed **Network** URL works from a
phone on the same Wi-Fi. That matters — logging expenses on a phone is the
primary use case, and it's worth testing there early.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` |
| `npm run typecheck` / `lint` / `test` | the pre-finish gate — all three must pass |
| `npm run test:tz` | runs `src/lib` tests under 4 timezones (see below) |

`npm run test:tz` exists because **a timezone bug is invisible in the timezone
you wrote it in**. It runs the date tests under UTC, `America/New_York`
(negative offset, has DST), `Asia/Manila`, and `Pacific/Kiritimati` (UTC+14) —
the pair that brackets both failure directions.

## Read this before writing code

**[`docs/conventions.md`](docs/conventions.md)** — the three cross-cutting
contracts (money, dates, query keys) plus the chart palette findings. The two
that will bite hardest:

- **Money is integer centavos.** There is exactly one `formatPeso` in this repo
  and it takes centavos. Do not copy the one from `sqrly-cfe/lib/format.ts` —
  same name, 100× different meaning.
- **A plain date is a string end to end.** ESLint bans `toISOString`,
  `toLocaleDateString`, and single-arg `new Date()` outside `lib/date.ts`.

## Structure

Mirrors the `sqrly-cfe` module shape, adapted to Vite:

```
src/pages/<module>/{<Name>Page.tsx, _types.ts, _constant.ts,
                    _hooks/api.ts, _form/, _components/}
src/components/{ui,ds,layout}/      lib/  hooks/
```

Three amendments to the POS conventions, each deliberate:

1. **`<Name>Page.tsx`, not `page.tsx`.** Next forced that filename; Vite
   doesn't. Twelve tabs all reading `page.tsx` makes `Ctrl+P` useless.
2. **The `_` prefix stays**, re-purposed to mean "not a route file."
3. **Dialog CRUD for categories / accounts / budgets / recurring.** A full-page
   form per edit is three navigations to rename "Groceries". Installments keeps
   the full-page treatment because its form is large.

### Three load-bearing ESLint rules

Beyond the standard set, `eslint.config.mjs` enforces: axios only inside
`lib/api.ts`; the date bans above; and no `components/ui/*` imports from
`src/pages/**` (wrap it in `components/ds/` first).
