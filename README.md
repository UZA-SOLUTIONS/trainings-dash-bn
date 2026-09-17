# Training dashboard API

Staff-only backend for cohort training: candidates, attendance, marks, issues, and reports.

This is a separate app from `trainings-bn` (UZA Mobility). Use a **new** MongoDB database — do not reuse `uza_mobility`.

## Setup

1. Create a new local or Atlas database (for example `uza_training_dash`).
2. Copy `.env.example` to `.env` and set `MONGODB_URI` and `JWT_SECRET`.
3. `npm install`
4. `npm run dev`

API: `http://localhost:5000`

### Default staff (seeded if missing)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@uza.rw` | `SEED_STAFF_PASSWORD` (default `ChangeMe123!`) |
| Instructor | `instructor@uza.rw` | same |

CORS allows localhost, `*.vercel.app`, and `uzamobility.com`. Set `CLIENT_URL` to the dashboard origin (`http://localhost:5173` locally).

## Vercel

Point the existing **trainings-dash-bn** project at this GitHub repo (`UZA-SOLUTIONS/trainings-dash-bn`), production branch `main`. Env: new `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` (dashboard origin).
