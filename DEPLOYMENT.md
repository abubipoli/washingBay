# Deployment Guide — First Class Washing Bay

Two separate things to set up: **running it on your own computer** (for
testing/demo) and **putting it online** for real use. This app is a
Next.js server app + a Postgres database — it is *not* a static site, so it
needs somewhere that can run Node.js continuously, not just serve files.

---

## Part 1 — Run it locally (on your Mac)

### 1. Install prerequisites (one-time)

- **Node.js** — download the LTS installer from https://nodejs.org and run
  it, OR if you use Homebrew: `brew install node`
- **Docker Desktop** — download from https://www.docker.com/products/docker-desktop
  (gives you Postgres without installing it directly on your Mac). Install
  it, then open the Docker Desktop app once so it finishes setup.

Verify both installed:
```bash
node -v      # should print v18.x or higher
docker -v    # should print a version
```

### 2. Set up and run the app

```bash
cd /Users/m1air/Documents/washingBay
cp .env.example .env
```
Open `.env` and set `NEXTAUTH_SECRET` to a random value:
```bash
openssl rand -base64 32
```
paste the output as the value of `NEXTAUTH_SECRET`.

Then:
```bash
docker compose up -d      # starts Postgres in the background
npm install                # installs all packages (first time only)
npm run db:migrate         # creates the database tables
npm run db:seed            # creates the owner login + sample data
npm run dev                # starts the app
```
Open **http://localhost:3000** — sign in with the owner email/password
printed in your terminal by the seed step. This is your local copy; closing
the terminal or restarting your Mac stops it (run `npm run dev` again to
bring it back, `docker compose up -d` if Postgres also isn't running).

---

## Part 2 — Going online with UltraHost Ghana

Since you're on **shared hosting with cPanel**, the deciding question is:
**does your plan support Node.js apps?** Budget shared hosting is usually
built for PHP/WordPress sites and cannot run a Node.js + Postgres app at
all — you need to check first.

### How to check your cPanel

1. Log into your UltraHost cPanel.
2. Look for an icon called **"Setup Node.js App"** (sometimes under a
   "Software" section). If it's there, Node.js is supported.
3. Look under **"Databases"** for **"PostgreSQL Databases"**. Many shared
   hosts only offer **MySQL Databases** — that's fine, it just means one
   extra step (below).
4. If you don't see Node.js at all, or you're unsure, open a support
   ticket with UltraHost and ask directly: *"Does my hosting plan support
   Node.js applications, and do I have PostgreSQL or only MySQL?"* — this is
   the fastest way to get a definitive answer for your exact plan.

Based on the answer, pick one of the three paths below.

---

### Path A — cPanel has Node.js + PostgreSQL

You can host everything on UltraHost directly.

1. In cPanel → **PostgreSQL Databases**, create a database, a database
   user, and add that user to the database with all privileges. Note the
   database name, username, password, and host (usually `localhost`).
2. In cPanel → **Setup Node.js App**, create a new application:
   - Node.js version: 18 or higher
   - Application mode: Production
   - Application root: e.g. `washingbay` (a folder in your hosting account)
   - Application URL: your domain (or a subdomain)
   - Application startup file: `server.js` — see note below.
3. Upload the project files into that application root — either via cPanel
   File Manager (zip the project, excluding `node_modules`, and extract it
   there) or via Git if cPanel offers a Git repository feature.
4. In the Node.js app screen, open its terminal/"Run NPM Install" button, or
   SSH in if your plan includes SSH access, and run:
   ```bash
   npm install
   npx prisma migrate deploy
   npx prisma db seed
   npm run build
   ```
5. Set environment variables in the cPanel Node.js app's "Environment
   Variables" section (same keys as your local `.env`): `DATABASE_URL`
   (using the Postgres credentials from step 1, e.g.
   `postgresql://dbuser:dbpass@localhost:5432/dbname`), `NEXTAUTH_SECRET`,
   `NEXTAUTH_URL` (your real `https://yourdomain.com`), and the `SMS_*`
   variables once you have Kairos Africa credentials.
6. Next.js's own server doesn't speak cPanel's expected `server.js`
   interface directly — cPanel's Node.js Selector expects an app that
   listens via the `PORT` environment variable it assigns. Use this small
   wrapper as your startup file (create `server.js` in the project root):
   ```js
   const { createServer } = require("http");
   const next = require("next");
   const app = next({ dev: false });
   const handle = app.getRequestHandler();
   app.prepare().then(() => {
     createServer((req, res) => handle(req, res)).listen(process.env.PORT || 3000);
   });
   ```
   Set the Node.js app's startup file to `server.js`.
7. Restart the app from the cPanel Node.js interface. Visit your domain.
8. Turn on **AutoSSL** (cPanel → SSL/TLS Status) so your domain gets a free
   HTTPS certificate — required for the PWA install prompt and for SMS/login
   security.

### Path B — cPanel has Node.js but only MySQL (no PostgreSQL)

Same as Path A, but the app's database layer (Prisma) needs to point at
MySQL instead of Postgres — a small code change, not a rebuild. Tell me and
I'll switch `prisma/schema.prisma`'s `provider` from `postgresql` to
`mysql` and adjust the connection string format
(`mysql://user:pass@localhost:3306/dbname`); everything else in the app
stays the same since Prisma abstracts the database differences.

### Path C — cPanel has no Node.js support at all

This is common on entry-level shared hosting, and it means the app simply
cannot run on that plan — not a configuration problem, a hard limitation.
Two practical options:

1. **Ask UltraHost to upgrade you to a VPS/Cloud plan.** That gives you a
   full Linux server (root/SSH access) where we can install Node.js,
   Postgres, Nginx, and a process manager (PM2) directly — full control,
   and everything in this repo runs as-is. If you go this route, come back
   and I'll walk you through the VPS setup step by step (it's a different,
   more hands-on process than cPanel).

2. **Host the app on a Node-friendly platform, keep your domain at
   UltraHost.** This is the cheapest and fastest option and is very common
   even for businesses that already own a domain elsewhere:
   - Deploy the app to **Vercel** (built by the makers of Next.js — free
     tier is enough to start) or **Railway**/**Render** (both offer a free
     or low-cost Postgres database alongside the app).
   - Point your domain at it: in UltraHost's DNS management for your
     domain, add the DNS record the hosting platform gives you (usually a
     CNAME or an A record) — your domain keeps working, it just now points
     to where the app actually runs. Your domain registration/email can
     stay at UltraHost untouched.
   - I can walk you through a Vercel + Neon (free Postgres) deployment in
     detail if you'd like — it's usually the simplest path for a small
     business and avoids fighting shared-hosting limitations entirely.

---

## My recommendation

Given you're on shared cPanel hosting and the exact Node.js/Postgres
support is still unconfirmed: **open a ticket with UltraHost today asking
the question in "How to check your cPanel" above.** While you wait for
their answer, I'd lean toward **Path C, option 2 (Vercel + Neon, domain
stays at UltraHost)** regardless of what they say — it's free to start,
handles HTTPS and scaling automatically, and sidesteps shared-hosting
Node.js quirks entirely. Let me know which way you want to go and I'll give
you the exact next steps for that path.
