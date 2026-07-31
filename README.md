# MedAid Advisor — UI

Multi-module medical aid advisor frontend. Next.js 16 App Router with:
- **Dashboard** — action hub (Questionnaire / Chat / Recommend)
- **Questionnaire** — 7-section needs assessment
- **Chat** — RAG-powered conversational interface
- **Recommend** — Broker plan recommendation engine (upload → match → refine)

## Stack

- Next.js 16.2 (App Router, `output: 'standalone'`)
- React 19
- TypeScript 5.9
- Tailwind CSS 4 (PostCSS)
- shadcn/ui (new-york)
- React Hook Form + Zod
- i18next + react-i18next
- vitest + React Testing Library
- Google Maps JS API Loader

## Development

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # vitest run
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # next build (writes .next/standalone)
```

Or use the `Justfile` recipes (`just dev`, `just build`, etc.).

## Environment

Set `NEXT_PUBLIC_API_BASE_URL` to point at your backend:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.medaid.example.com
```

## API Contracts

The frontend is a pure API consumer. Endpoints expected:

- `POST /chat` — `ChatRequest { message, sessionId? }` → `ChatResponse { response, sessionId? }`
- `POST /recommend` — `PlanRecommendationRequest { clientData }` → `PlanRecommendationResponse { recommendations[], reasoning[], alternatives[] }`

When the backend is unreachable, the Recommend page falls back to mock data
for development.

## Deployment

The app is containerised for Google Cloud Run:

```bash
just docker-build   # build image locally
just docker-push    # push to Artifact Registry
just deploy         # build, push, deploy
```

The Dockerfile uses Next.js `output: 'standalone'` to produce a minimal Node
runtime image that listens on `PORT=8080`.
