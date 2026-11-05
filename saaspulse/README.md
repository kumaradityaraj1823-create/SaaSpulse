# SaaSPulse

Subscription revenue analytics for a SaaS business: MRR, ARR, churn, net revenue retention, plan mix, and a full customer directory with CSV import and export.

**Stack:** React 19 + Vite + Tailwind CSS v4 + Recharts · Node.js + Express · MongoDB + Mongoose · Zod validation

---

## Run it

You need Node.js 20 or newer.

```bash
# Terminal 1: API on http://localhost:5000
cd backend
npm install
npm run dev

# Terminal 2: web app on http://localhost:5173
cd frontend
npm install
npm run dev
```

With no database configured, the backend starts a temporary **in-memory MongoDB** and fills it with 18 months of demo data. Everything works, but data resets when the server restarts. The sidebar shows which database you're connected to.

### Connect your own MongoDB

Edit `backend/.env`:

```bash
# Local MongoDB (MongoDB Community Server or Docker)
MONGODB_URI=mongodb://127.0.0.1:27017/saaspulse

# or MongoDB Atlas (free tier works)
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/saaspulse
```

Restart the backend. If the database is empty it seeds demo data automatically (turn off with `AUTO_SEED=false`). To wipe and reload demo data at any time: `npm run seed`.

For Atlas: in *Network Access*, allow your IP address; in *Database Access*, create a user, and URL-encode special characters in the password.

### Tests

```bash
cd backend
npm test        # 9 API tests against a throwaway in-memory MongoDB
```

---

## How the numbers work

Every change to a customer's revenue is saved as an **Activity** event (`signup`, `upgrade`, `downgrade`, `churn`, `reactivation`) with its `mrrDelta`. Charts are rebuilt from these events with a MongoDB aggregation, so each month shows what actually happened then, not just today's state.

| Metric | Formula |
| --- | --- |
| MRR | Sum of `mrr` for active customers |
| ARR | MRR × 12 |
| ARPU | MRR ÷ active customers |
| Customer churn (month) | Customers who cancelled in the month ÷ customers at the start of the month |
| Net revenue retention (month) | (Start MRR + expansion − contraction − churned MRR) ÷ start MRR |
| Net new MRR | New + reactivation + expansion − contraction − churn |

Churn and NRR use the **last complete month**, so a half-finished month doesn't look artificially good. A customer's `mrr` is copied from the plan when they subscribe or change plan, so raising a plan's price later doesn't rewrite past revenue.

---

## Project structure

```
backend/
  src/
    config/        env.js (settings), db.js (MongoDB connection + in-memory fallback)
    models/        Plan, Customer, Activity (Mongoose schemas + indexes)
    validators/    Zod schemas for every request body and query
    middleware/    validate(), central error handler (Zod, Mongoose, duplicates, uploads)
    services/      business logic: customers, plans, metrics (aggregations), CSV import
    controllers/   thin HTTP layer that calls services
    routes/        all /api routes in one file
    data/seed.js   simulated 18-month history (seeded random, same every time)
    scripts/       npm run seed
    app.js         Express app (helmet, CORS, compression, logging)
    server.js      connects to MongoDB, seeds if empty, starts listening
  test/            node:test API tests

frontend/
  src/
    lib/           api.js (fetch client), format.js (₹, lakh/crore), hooks.js (data, theme)
    components/
      layout/      AppShell, Sidebar, CommandMenu (Ctrl/⌘ K)
      ui/          Button, Field, Modal, Drawer, Toast, badges, panels
      charts/      MRR area chart, MRR movements, revenue by plan
    pages/         Overview, Customers (+ drawer & form), Plans, Import
```

---

## API

All responses are JSON: `{ success: true, data, ... }` or `{ success: false, error: { message, details? } }`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Server and database status |
| GET | `/api/metrics/overview?months=12` | KPIs, monthly trend, plan breakdown, top accounts (`months`: 3, 6, 12, 24) |
| GET | `/api/activity?limit=15` | Latest revenue events |
| GET | `/api/customers` | List. Query: `search`, `status` (all/active/churned), `plan` (id), `sort` (e.g. `-mrr`, `name`), `page`, `limit` |
| GET | `/api/customers/export` | Same filters, returns CSV |
| GET | `/api/customers/:id` | One customer with revenue history |
| POST | `/api/customers` | Create: `name`, `email`, `planId`, optional `company`, `city`, `signupDate`, `notes` |
| PATCH | `/api/customers/:id` | Edit fields or change plan (records upgrade/downgrade) |
| PATCH | `/api/customers/:id/status` | `{ status: "churned", reason }` or `{ status: "active" }` |
| DELETE | `/api/customers/:id` | Delete customer and their history |
| GET | `/api/plans` | Plans with subscribers, MRR, share, churn |
| POST | `/api/plans` | Create: `name`, `monthlyPrice`, `description` |
| PATCH | `/api/plans/:id` | Edit, or `{ isArchived: true }` to stop new signups |
| DELETE | `/api/plans/:id` | Only if no customer has ever used it (409 otherwise) |
| POST | `/api/imports/customers?dryRun=true` | Multipart `file` (CSV). Dry run validates every row; without it, valid rows are inserted |
| GET | `/api/imports/template` | Example CSV |

CSV columns: `name`, `email`, `plan` (required), `company`, `city`, `signup_date`, `status`, `churn_date` (optional).

---

## Notes for deployment

- Set `NODE_ENV=production`, `MONGODB_URI`, and `CORS_ORIGIN` to your frontend's URL.
- Build the frontend with `npm run build`; if the API is on another domain, set `VITE_API_BASE=https://your-api.example.com/api` before building.
- MongoDB transactions aren't used, so a standalone MongoDB works. With a replica set (Atlas), the CSV import could be wrapped in a transaction.
