# frontend_sim

React + Vite + antd frontend for the pharmacy dispensing automation console — the console pharmacists use to manage prescriptions, medicines, and departments, and to track them through the dispensing pipeline. Talks to the `backend-sim` API; not a standalone app.

## Prerequisites

- Node.js + npm
- A running instance of `backend-sim` (see its own README) — reachable at the URL you'll set below

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the env template and fill it in:
   ```bash
   cp .env.example .env
   ```
   - `VITE_API_BASE_URL` — must match the backend's actual `PORT` (e.g. `http://localhost:3001`).
   - `VITE_API_TIMEOUT` — request timeout in ms.

3. Run it:
   ```bash
   npm run dev
   ```
   Vite bumps the port if `5173` is already taken — check the terminal output for the actual URL.

## Scripts

- `npm run dev` — dev server
- `npm run build` — `tsc -b && vite build` (typecheck is part of the build)
- `npm run lint` — oxlint
- `npm run preview` — preview a production build locally
- `npx tsc -b` — typecheck only

There is no test runner configured (no test script, no test framework installed).
