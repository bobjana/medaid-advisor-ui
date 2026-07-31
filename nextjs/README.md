# MedAid Advisor — Next.js UI

Multi-module medical aid advisor frontend. Next.js 16 App Router with:
- **Dashboard** — action hub (Questionnaire / Chat / Recommend)
- **Questionnaire** — 7-section needs assessment (port from Vite app)
- **Chat** — RAG-powered conversational interface
- **Recommend** — Broker plan recommendation engine (upload → match → refine)

The Vite/React app at the project root remains the primary deployment until
migration is complete.

## Stack

- Next.js 16.2 (App Router)
- React 19
- TypeScript 5.9
- Tailwind CSS 4 (PostCSS)
- shadcn/ui (new-york)
- React Hook Form + Zod
- i18next
- vitest + React Testing Library

## Development

```bash
cd nextjs
npm install
npm run dev      # http://localhost:3000
npm test         # vitest
npx next build   # production build
```

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
