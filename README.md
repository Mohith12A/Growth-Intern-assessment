# NxtWave AI Project Arena

MVP foundation for the public event website and the secured organizer API. MongoDB is the system of record. Google Sheets and email are represented by durable integration outbox jobs; connect approved credentials and n8n workflows before sending data externally.

## Run locally

1. Install Node.js 20+ and MongoDB Atlas/local MongoDB.
2. Copy `.env.example` to `.env` in the project root (or place it at `backend/.env`; the backend-specific file takes precedence). Set the Atlas URI, a random JWT secret of at least 32 characters, and a one-time admin setup key. The backend loads either location.
3. Run `npm.cmd install` at the repository root. In PowerShell, use `npm.cmd` if script execution blocks `npm.ps1`.
4. In one terminal run `npm.cmd run dev:api`; in another run `npm.cmd run dev`.
5. Visit `http://localhost:5173`. Seed colleges and create the first admin through the API steps below.

## First organizer

POST `/api/admin/setup` once with header `x-setup-key: <ADMIN_SETUP_KEY>` and JSON `{ "name": "Organizer", "email": "you@example.com", "password": "a-long-unique-password" }`. Then POST `/api/admin/login` with email/password and use the returned bearer token for `/api/admin/*` endpoints. Setup is permanently disabled once an organizer exists.

## MVP endpoints

- Public: `GET /api/health`, `GET /api/public/colleges`, `POST /api/public/registrations`, `GET /api/public/leaderboard`.
- Organizer: `POST /api/admin/login`, `GET /api/admin/overview`, `GET/POST /api/admin/colleges`, `GET/POST /api/admin/ambassadors`, `GET /api/admin/registrations`, `PATCH /api/admin/registrations/:id/status`.
- Registration input is validated server-side, email is unique, actual college and referrer are stored separately, and new submissions start `pending`. Only organizer-verified `valid` records appear in counts/leaderboards.

## Current scope and launch decisions

Event date/time, eligibility rules, official prizes, milestone thresholds, points, and tie-break policy remain unpublished until organizers approve them. Confirmation and Sheets sync jobs are queued but no provider credentials or workflows are assumed. Registration email verification, full ambassador login/dashboard, project judging, and Google Sheets/n8n delivery need their own implementation/configuration before a production launch.



## Spline hero scene

The hero includes the Spline Viewer module and a neon CSS fallback. To activate your 3D scene, export it from Spline, set `VITE_SPLINE_SCENE_URL` in the project-root `.env` to the exported `.splinecode` URL, then restart Vite. The placeholder URL `not-exported-yet` is intentionally not used because it is not a valid exported scene.