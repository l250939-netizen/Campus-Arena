# CampusArena Codebase Guide

This guide explains how the current project is organized, how its main flows work, and what still needs to happen before calling it complete. It describes the code currently in the repository; a feature being implemented does not mean it has been fully tested or deployed.

## What the application does

CampusArena is a university-oriented platform for finding and organizing activity sessions and carpools. The main application has a React/Vite frontend and an Express API backed by MongoDB. Users register with a university email, verify it, and can then use protected session and carpool features.

The accepted email domain is `nu.edu.pk`, including subdomains such as `isb.nu.edu.pk`. Registration still sets the university field to `FAST Islamabad`; accepting an email domain does not currently identify or assign a different university.

## Project map

```text
campusarena/
|-- package.json                Root commands for installing, developing, building, and testing
|-- Readme.md                   Project overview and development notes
|-- CODEBASE_GUIDE.md           This guide
|-- client/
|   |-- src/
|   |   |-- main.jsx            React browser entry point
|   |   |-- App.jsx             Main application, page sections, API calls, and UI state
|   |   |-- App.css             Main application styles
|   |   |-- index.css           Global styles
|   |   |-- config.js           Frontend API base URL
|   |   `-- components/Auth.jsx Registration, login, and email verification UI
|   |-- .env.example             Frontend environment variable example
|   |-- vite.config.js           Vite development/build configuration
|   `-- package.json             Frontend scripts and dependencies
|-- server/
|   |-- server.js                Loads config, connects MongoDB/SMTP, and starts HTTP server
|   |-- app.js                   Express middleware and API route mounting
|   |-- config.js                Port, frontend origin, and app URL configuration
|   |-- routes/                  API route handlers and business rules
|   |-- models/                  Mongoose document schemas
|   |-- middleware/              JWT and verified-email access checks
|   |-- utils/smtpService.js     SMTP setup, sending, and connection check
|   |-- tests/                   Jest/Supertest integration tests
|   |-- .env.example             Backend environment variable example
|   `-- package.json             Backend scripts and dependencies
|-- index.html, css/, js/         Separate static prototype; not the React app
```

Generated files such as `node_modules/` and `client/dist/` are not source code. The `.env` files contain local configuration and must remain private; use the `.env.example` files to understand the required variable names.

## How a request moves through the app

1. `client/src/main.jsx` mounts `App.jsx` in the browser.
2. `client/src/config.js` supplies the API URL from `VITE_API_URL` (default: `http://localhost:5000`).
3. `App.jsx` and `components/Auth.jsx` send HTTP requests to the API. Authenticated requests attach a JWT as `Authorization: Bearer <token>`.
4. `server/app.js` parses JSON, applies CORS rules, and mounts route files under `/api`.
5. Protected route handlers use `authMiddleware.js` to verify the JWT and load the user. Most session/carpool write operations and reward/review submission also use `requireVerifiedUser.js`.
6. Route handlers read or update MongoDB through the Mongoose models in `server/models/`.

The JWT is kept in React application state; this implementation does not persist it across a page reload.

## Frontend guide

### React application

- [`client/src/main.jsx`](./client/src/main.jsx) is the React entry point.
- [`client/src/App.jsx`](./client/src/App.jsx) is the main screen and holds most application state and API interactions. Its visible sections include the profile/leaderboard, session creation, session discovery, personal sessions, reviews, carpool discovery, carpool creation, and management of the user's carpools.
- The `SessionCountdown` component in `App.jsx` displays whether a session is upcoming, in progress, or completed. The server independently checks session end times before allowing review, attendance, and rewards.
- [`client/src/components/Auth.jsx`](./client/src/components/Auth.jsx) provides register/login modes, handles the `/verify-email?token=...` link, and supports resending verification email.
- `client/src/App.css` and `client/src/index.css` style the application. Static assets live in `client/src/assets/` and `client/public/`.
- [`client/src/config.js`](./client/src/config.js) chooses the API base URL.

`App.jsx` currently combines many screens, API calls, and state in one large component. Splitting it into feature components would improve maintainability, but is not required to run the current app.

### Separate static prototype

The top-level `index.html`, `css/style.css`, and `js/script.js` form a separate static demo. They are not the React frontend and do not call the backend to create real accounts. The root prototype has a simple client-side registration preview; the React application is the full-stack frontend.

## Backend guide

### Startup and configuration

- [`server/server.js`](./server/server.js) checks required settings, connects to MongoDB, checks SMTP, and starts listening.
- [`server/app.js`](./server/app.js) configures JSON parsing and CORS and mounts the API routes.
- [`server/config.js`](./server/config.js) sets local defaults and derives production settings. `CLIENT_ORIGIN` can contain a comma-separated origin allowlist.
- [`server/utils/smtpService.js`](./server/utils/smtpService.js) creates a Nodemailer transport from environment settings, sends email, and checks SMTP connectivity.

### Access control

- [`server/middleware/authMiddleware.js`](./server/middleware/authMiddleware.js) requires a valid bearer JWT and loads its user.
- [`server/middleware/requireVerifiedUser.js`](./server/middleware/requireVerifiedUser.js) blocks unverified users from routes that require verified email.
- Public read routes are intentionally not always authenticated; see the route list below.

### Data models

| Model | Stores |
|---|---|
| [`User.js`](./server/models/User.js) | Name, email, password hash, university, gender, email-verification state/token fields, and merit points |
| [`Session.js`](./server/models/Session.js) | Activity details, host, joined participants, attendance, and optional study-session details |
| [`Review.js`](./server/models/Review.js) | One 1–5-star review per reviewer per session, with an optional comment |
| [`SessionReward.js`](./server/models/SessionReward.js) | Merit points awarded for a session; a unique index prevents duplicate reward records of the same type |
| [`Carpool.js`](./server/models/Carpool.js) | Journey details, creator, seat/fare preferences, status, and join requests |

ObjectId references connect sessions, carpools, reviews, rewards, and users. Mongoose schema validation is supplemented by route-level checks.

## API route reference

All paths below are relative to `/api`. “Verified” means the handler requires both a valid JWT and a verified email.

### Authentication — [`authRoutes.js`](./server/routes/authRoutes.js)

| Method and path | Access | Purpose |
|---|---|---|
| `POST /auth/register` | Public | Create an account and send (or locally expose) an email-verification token |
| `POST /auth/verify-email` | Public | Verify an account using its token |
| `POST /auth/resend-verification` | Public | Resend an eligible verification email subject to cooldown |
| `POST /auth/login` | Public | Check credentials and return a JWT and public user data |
| `POST /auth/logout` | Public | Return a logout acknowledgement; the client clears its in-memory auth state |
| `GET /auth/me` | Bearer JWT | Return the authenticated user's profile |
| `GET /auth/leaderboard` | Bearer JWT | Return the top merit-point users |

The registration validator accepts email addresses ending in `nu.edu.pk`, including subdomains, and rejects domains that merely contain similar text.

### Sessions — [`sessionRoutes.js`](./server/routes/sessionRoutes.js)

| Method and path | Access | Purpose |
|---|---|---|
| `GET /sessions` | Public | List sessions |
| `GET /sessions/my` | Bearer JWT | List sessions created by the current user |
| `POST /sessions` | Verified | Create a session |
| `POST /sessions/:id/join` | Verified | Join a session if eligible and not full |
| `POST /sessions/:id/attendance` | Verified host | Record/update a joined participant's attendance after the session ends |
| `PATCH /sessions/:id` | Verified host | Edit an allowed set of session fields |
| `DELETE /sessions/:id` | Verified host | Delete/cancel the session |

### Reviews — [`reviewRoutes.js`](./server/routes/reviewRoutes.js)

| Method and path | Access | Purpose |
|---|---|---|
| `GET /reviews/session/:sessionId/mine` | Bearer JWT | Find the current user's review |
| `GET /reviews/session/:sessionId` | Public | List reviews for a session |
| `POST /reviews/session/:sessionId` | Verified participant | Submit a review after the session ends |

The schema's unique index enforces at most one review from a user for a given session.

### Rewards — [`rewardRoutes.js`](./server/routes/rewardRoutes.js)

| Method and path | Access | Purpose |
|---|---|---|
| `POST /rewards/session/:sessionId/claim` | Verified host | Award points after the session ends to participants recorded present |

The reward handler uses a MongoDB transaction and a unique reward record to avoid duplicate awards. Transactions require a MongoDB deployment that supports them (for example, a replica set or Atlas cluster).

### Carpools — [`carpoolRoutes.js`](./server/routes/carpoolRoutes.js)

| Method and path | Access | Purpose |
|---|---|---|
| `GET /carpools?journeyType=...` | Public | List non-cancelled carpools, optionally filtered by journey type |
| `GET /carpools/my` | Verified | List carpools created by the current user |
| `GET /carpools/:id` | Public | Get carpool details |
| `POST /carpools` | Verified | Create a carpool |
| `POST /carpools/:id/request` | Verified | Request to join a carpool |
| `PATCH /carpools/:id/requests/:requestId` | Verified creator | Approve or reject a join request |
| `PATCH /carpools/:id` | Verified creator | Update a carpool |
| `DELETE /carpools/:id` | Verified creator | Mark the carpool cancelled |

## Environment and local development

1. In a terminal, enter the `campusarena` project folder.
2. Install both sets of dependencies with `npm run install:all`.
3. Create `server/.env` from `server/.env.example`, then set a reachable MongoDB URI, a strong private JWT secret, and SMTP settings if email delivery is needed.
4. Create `client/.env` from `client/.env.example` if the API is not at its default local URL.
5. Run both development servers with `npm run dev`. The client normally uses `http://localhost:5173`, and the API uses `http://localhost:5000`.

Useful scripts:

| From project root | What it does |
|---|---|
| `npm run dev` | Starts client and server concurrently |
| `npm run build` | Builds the client for production |
| `npm test` | Runs backend Jest tests |
| `npm start` | Starts the backend in production/start mode |

From `client/`, `npm run lint` runs ESLint. On Windows PowerShell, if execution policy blocks `npm`, run the corresponding command through `npm.cmd`.

Never copy actual `.env` contents into documentation, commits, screenshots, or issue reports. Environment examples should contain placeholders only.

## What's left before completion

“Complete” can mean a working local demo, a verified feature set, or a production launch. The code has implementations for the main registration, session, review, reward, and carpool flows, but the following work remains to establish release readiness:

1. **Get repeatable checks passing.** Run backend tests against an isolated test database and resolve test failures. In the last recorded focused email-test run, 7 tests passed and 2 failed while reading the verification-token expiry field; the schema marks that field `select: false`, so the test's query/expectation needs checking. That run did include the new subdomain acceptance and lookalike rejection tests, both of which passed.
2. **Resolve frontend lint errors.** The most recent `npm run lint` reports React hook purity/set-state-in-effect errors in `client/src/App.jsx` and `client/src/components/Auth.jsx`, plus a hook dependency warning in `App.jsx`. These are broader existing code-quality issues, not part of email-domain validation.
3. **Run complete user journeys in a browser.** Verify registration through email delivery, email verification, login, session create/join/attendance/review/reward, and carpool create/request/approve/edit/cancel. Check both success and failure cases, including mobile layouts.
4. **Review backend behavior before production.** Confirm expected authorization and input validation, concurrency/capacity behavior, safe public data, and MongoDB transaction support for rewards.
5. **Configure and validate a production deployment.** Set production secrets, HTTPS app URL, allowed frontend origins, deployed API URL, MongoDB access, SMTP delivery, hosting/build settings, and monitoring/logging. Then run smoke tests against the deployed services.
6. **Bring project documentation up to date.** The existing `Readme.md` has generic roadmap/status notes; update it after the above checks establish what is actually done.

The client production build succeeded during the latest email-domain change. That confirms the frontend bundles, but it does not replace lint, backend tests, browser testing, or deployment checks.

## Suggested reading order

1. Read this guide and the root `package.json`.
2. Follow `client/src/main.jsx` → `client/src/App.jsx` → `client/src/components/Auth.jsx`.
3. Follow `server/server.js` → `server/app.js` → the relevant `server/routes/` file.
4. Inspect the corresponding `server/models/` schema and middleware.
5. Read the matching test in `server/tests/` to see the intended behavior.
