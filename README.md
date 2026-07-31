# MedAid Advisor — UI

Multi-module medical aid advisor frontend. Next.js 16 App Router with:
- **Dashboard** (`/`) — action hub linking into the three workflows
- **Questionnaire** (`/questionnaire`) — 7-section needs assessment with
  React Hook Form + Zod validation, progress autosaved to `localStorage`
- **Chat** (`/chat`) — conversational interface for plan questions
  (`POST /chat`)
- **Recommend** (`/recommend`) — broker-grade plan matching that uploads
  client data and returns scored recommendations with reasoning
  (`POST /recommend`)

## Stack

- **Framework**: Next.js 16.2 (App Router, `output: 'standalone'`)
- **Runtime**: React 19, TypeScript 5
- **Styling**: Tailwind CSS 4 (PostCSS), shadcn/ui (new-york), Radix UI,
  Lucide icons
- **Forms**: React Hook Form + Zod (`src/lib/validation.ts`)
- **i18n**: i18next + react-i18next (`src/i18n/`, English + Afrikaans)
- **API client**: typed fetch wrapper (`src/lib/api/client.ts`)
- **Testing**: vitest + React Testing Library + jsdom
- **Container**: multi-stage Docker (`Dockerfile`) → non-root Node 20 alpine
  listening on `PORT=8080`
- **CI/CD**: GitHub Actions → Artifact Registry → Cloud Run
  (`europe-west4`)

## Project Layout

```
src/
  app/                   Next.js App Router pages
    page.tsx               Dashboard (/)
    questionnaire/         7-section needs assessment
    chat/                  Chat interface
    recommend/             Plan recommendation flow
    layout.tsx             Root layout (Sidebar + Header shell)
    globals.css            Tailwind entry
  components/
    layout/               App shell (Sidebar, Header)
    questionnaire/        7 section components + PreferredProvidersCard
    recommend/            UploadZone, PlanCard, ResultsPanel
    location/             AddressAutocomplete (mock SA addresses),
                          NetworkHospitalsMap
    shared/               ErrorBoundary, LoadingSpinner, EmptyState
    ui/                   shadcn/ui primitives (button, card, dialog,
                          form, input, label, progress, radio-group,
                          select, separator, textarea, checkbox)
    LanguageSelector.tsx
  hooks/                  useLocalStorage, useLocation
  i18n/                   i18next setup + translation resources
  lib/
    api/                  Typed API client + chat/recommend endpoints
    validation.ts         Zod schemas for the questionnaire
    utils.ts              cn() helper + shared utilities
  types/                  Shared TS types (api, questionnaire)
  __tests__/              vitest specs (navigation registry, smoke)
  test-setup.ts           @testing-library/jest-dom setup
public/                   Static assets (Next.js default SVGs)
```

## Development

```bash
just install        # npm ci (clean install from lockfile)
just dev            # http://localhost:3000

just check          # typecheck + lint + test (CI parity)
just typecheck      # tsc --noEmit
just lint           # eslint
just format         # eslint --fix
just test           # vitest run
just test-watch     # vitest --watch

just build          # next build (writes .next/standalone)
just start          # next start (after build)
```

Direct `npm` scripts work too — the `Justfile` is a convenience wrapper.

## Environment

Create `.env.local` at the project root with the backend base URL:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.medaid.example.com
```

Defaults to `http://localhost:8080` if unset (see
`src/lib/api/client.ts`). When the backend is unreachable, the Recommend
page falls back to a small mock dataset for local development.

## API Contracts

The frontend is a pure API consumer. Types live in `src/types/api.ts`:

| Endpoint            | Request                                | Response                                          |
| ------------------- | -------------------------------------- | ------------------------------------------------- |
| `POST /chat`        | `ChatRequest { message, sessionId? }`  | `ChatResponse { response, sessionId? }`           |
| `POST /recommend`   | `PlanRecommendationRequest { clientData: QuestionnaireData }` | `PlanRecommendationResponse { recommendations, reasoning, alternatives }` |

## Deployment

```bash
just docker-build   # local image (medaid-advisor-ui:latest)
just docker-run     # build + run container on port 8080

just docker-push    # build linux/amd64 + push to Artifact Registry
just deploy         # roll the latest image onto Cloud Run
just ship           # docker-push + deploy in one shot

just logs           # tail Cloud Run logs
just revisions      # list recent revisions
just open           # open the deployed service URL
```

Cloud Run service name: `medaid-advisor-ui` in project `med-aid-advisor`,
region `europe-west4`. The Dockerfile uses Next.js `output: 'standalone'`
to produce a minimal Node runtime image (~150 MB).
