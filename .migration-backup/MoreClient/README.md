# clientMORE Frontend Demo

Frontend-only SaaS chatbot demo built with Next.js, React, Tailwind CSS, lucide-react, and Recharts.

The backend, API routes, database, auth provider, background jobs, AI provider SDKs, payment integrations, and observability integrations have been removed. Dashboard, file upload simulation, handoffs, settings, notifications, and the embeddable chat widget run with local demo state.

## Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:5000.

## Scripts

```bash
npm run lint
npm run typecheck
npm run build
```

## Main Routes

- `/` landing page
- `/welcome` welcome screen
- `/sign-in` and `/sign-up` demo auth entry points
- `/dashboard` SaaS chatbot analytics
- `/dashboard/files` local knowledge-base upload simulation
- `/dashboard/handoffs` local support handoff inbox
- `/dashboard/settings` local widget and channel settings
- `/widget` embeddable chatbot preview
