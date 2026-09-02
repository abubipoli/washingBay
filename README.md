# First Class Washing Bay — Management System

A web + installable-mobile (PWA) management system for a car/truck/motorbike
washing bay: record every wash, split the payment transparently three ways
(business / washing boy / soap), pay washing boys with an SMS or printed
receipt as proof, track expenses, and see daily/monthly reports.

Built to match the "Elite Operation" design system you supplied (see
`design/DESIGN.md` if you keep it in the repo) — same colors, type scale,
spacing, and component styles as the Dashboard and Staff Performance mocks.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript** — one codebase serves both
  desktop web and a mobile-installable PWA (no separate native app needed).
- **PostgreSQL** + **Prisma ORM** — relational data, transactional payouts.
- **NextAuth (Credentials)** — manager/owner login, bcrypt-hashed passwords.
- **Tailwind CSS** — using the exact design tokens from DESIGN.md.
- **SMS**: pluggable provider interface (`src/lib/sms/`) — ships with a safe
  console logger for development and a Kairos Africa adapter stub for
  production (swap in real credentials when you have them).

## Why this data model

- Every wash stores its **three-way split as explicit amounts**, not just
  percentages — because you told us the split is "sometimes flexible and not
  strictly done" (e.g. blowing only splits business/boy, no soap leg). A
  manager can always override the numbers for one specific job; the default
  percentages per service just pre-fill the form.
- **Vehicle number is the primary record key** for each wash, with make/model
  optional — matching how you described staff actually logging jobs.
- **Payouts are transactional**: paying a washing boy locks in exactly which
  completed washes were included, so a wash can never accidentally get paid
  twice, and every payout has a paper trail (who paid it, when, which
  vehicles it covered).
- **Net Profit = Revenue − Staff Payouts − Expenses.** The "soap" split is
  informational (it shows how much of each job's price was earmarked for
  materials) — it isn't subtracted a second time, since actual soap spend
  already shows up under Expenses → Soap & Chemicals.

## Getting started

### 1. Prerequisites

- Node.js 18.18+ and npm
- Docker (easiest way to get local Postgres) — or your own Postgres 14+ instance

### 2. Install dependencies

```bash
npm install
```

### 3. Start Postgres (skip if you already have one)

```bash
docker compose up -d
```

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL` — already matches `docker-compose.yml` if you used step 3.
- `NEXTAUTH_SECRET` — generate one: `openssl rand -base64 32`
- `SMS_PROVIDER` — leave as `console` until you have Kairos Africa credentials
  (SMS messages will just be printed to your terminal instead of sent).

### 5. Create the database schema and seed starter data

```bash
npm run db:migrate
npm run db:seed
```

The seed script creates:
- A default **Owner** login (printed to your terminal — default
  `owner@firstclass.local` / `ChangeMe123!` unless you set
  `SEED_OWNER_EMAIL`/`SEED_OWNER_PASSWORD` first). **Change this password
  after your first login.**
- Starter service types: Full Wash + Vacuum, Body Wash Only, Detailing, and
  Blowing/Drying (the last one is a 2-way split — no soap leg — as an example
  of the flexible split in action).
- Three sample washing boys.

### 6. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`, sign in with the owner account, and you're in.

## Roles

- **Owner** — everything a Manager can do, plus: editing business settings
  (name/currency/address), and adding/editing service types & their default
  splits.
- **Manager** — day-to-day operations: record washes, update wash status,
  manage staff on/off shift, record expenses, run payouts.

Create additional logins directly in the database for now (via
`npm run db:studio`, which opens Prisma's data browser) — there's no
self-service "invite a manager" screen yet; see **Not yet built** below.

## Paying washing boys (SMS or printed receipt)

On the **Staff Performance** page, each boy with an outstanding balance shows
a **Pay** button. Clicking it lets you choose how to notify them:

- **SMS** — sends a message via whichever `SMS_PROVIDER` is configured.
- **Print receipt** — opens a printable payslip (`/receipt/payout/[id]`) in a
  new tab; hit Ctrl/Cmd+P. This is meant for handing a paper slip to boys who
  aren't comfortable relying on a phone notification alone — it lists every
  vehicle the payout covers, so it doubles as an audit trail.
- **No notice** — marks it paid without notifying (useful for backfilling).

Every wash receipt is also printable from the Revenue Recording table
(`/receipt/wash/[id]`) for handing to customers.

### Wiring up Kairos Africa for real SMS

`src/lib/sms/kairos-provider.ts` is a best-effort adapter (REST + Bearer
auth) written without access to Kairos Africa's actual API reference. Once
you have their docs:

1. Set `SMS_PROVIDER=kairos`, `KAIROS_API_BASE_URL`, `KAIROS_API_KEY`,
   `KAIROS_SENDER_ID` in `.env`.
2. Open `src/lib/sms/kairos-provider.ts` and adjust the endpoint path and the
   request/response JSON shape to match their real contract. Nothing else in
   the app needs to change — everything talks to the `SmsProvider` interface.

## Installing as a mobile app (PWA)

Once deployed to a real HTTPS domain, open the site on a phone and use the
browser's "Add to Home Screen" option — it installs like a native app
(`src/app/manifest.ts` + `public/sw.js`). Note: the app icon currently ships
as a simple generated SVG (`public/icons/icon.svg`); for the best look on
iOS specifically, generate proper 192×192/512×512 PNG icons (any favicon
generator works) and swap them into the manifest before a public launch.

## Reports

- **Dashboard** — Today / This Week / This Month toggle, revenue trend,
  expense breakdown, recent washes.
- **Export** buttons (Dashboard + Staff Performance) download a CSV of wash
  records for the selected period — opens directly in Excel/Google Sheets
  for a "fine report" outside the app.

## Project structure

```
prisma/schema.prisma       Data model (see comments for the split-money design)
src/lib/reports.ts         Shared business-summary + staff-performance queries
src/lib/sms/               Pluggable SMS provider (console + Kairos Africa)
src/lib/validation.ts      All input validation (zod)
src/app/(app)/             Authenticated app pages (dashboard, revenue, staff, settings)
src/app/api/                REST API routes backing the above
src/app/receipt/            Printable wash + payout receipts
```

## Not yet built (deliberately out of scope for v1)

- Self-service manager invites/accounts (use Prisma Studio for now)
- Multiple washing boys credited on a single job (currently one primary boy per wash)
- Public (non-authenticated) receipt links for texting/emailing to customers
- Offline data entry (the service worker is intentionally non-caching for
  financial-data safety — see comments in `public/sw.js`)
- Automated recurring expenses (e.g. monthly salary auto-entry)

## Security notes

- Passwords are hashed with bcrypt (12 rounds); never stored in plain text.
- Every mutating API route requires an authenticated session
  (`src/lib/api-guard.ts`); business-settings and service-type changes
  additionally require the Owner role.
- All financial inputs are validated server-side with zod — the three-way
  split is rejected if it doesn't add up to the total, even if someone
  bypasses the UI and calls the API directly.
- A wash that's already been paid out is locked (`payoutId` set) and its
  status can no longer be changed, preventing after-the-fact tampering with
  paid records.
