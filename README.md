# MedAid Advisor UI

React + TypeScript + Vite application with shadcn/ui and Tailwind CSS, deployed to Google Cloud Run.

## Stack

- **Runtime**: Node 20, React 19
- **Build**: Vite 7, TypeScript 5.9
- **UI**: shadcn/ui (new-york), Radix UI, Tailwind CSS 4, Lucide icons
- **Forms**: React Hook Form + Zod
- **i18n**: i18next + react-i18next
- **Maps**: Google Maps JS API
- **Linting**: ESLint 9 + typescript-eslint
- **Container**: Multi-stage Docker (node:20-alpine → nginx:alpine), port 8080
- **CI/CD**: GitHub Actions → Artifact Registry → Cloud Run (europe-west4)

## Prerequisites

- Node 20+
- [just](https://github.com/casey/just) (command runner)
- Docker (for container builds)
- `gcloud` CLI (for Cloud Run deploys)

## Quick Start

```bash
just install   # npm ci
just dev       # starts Vite dev server at http://localhost:5173
```

## Recipes

Run `just --list` to see all available recipes.

### Development

| Recipe | Description |
|---|---|
| `just install` | Install dependencies (clean, `npm ci`) |
| `just dev` | Start Vite dev server |
| `just dev-host` | Start dev server accessible on LAN |

### Build

| Recipe | Description |
|---|---|
| `just build` | Type-check and production build |
| `just typecheck` | TypeScript type-check only (no emit) |
| `just preview` | Preview production build locally |
| `just clean` | Remove `dist`, Vite cache, tsbuildinfo |
| `just clean-all` | Deep clean — also removes `node_modules` |

### Lint

| Recipe | Description |
|---|---|
| `just lint` | Run ESLint |
| `just format` | Run ESLint with auto-fix |

### Docker

| Recipe | Description |
|---|---|
| `just docker-build` | Build Docker image locally |
| `just docker-run` | Build and run container locally on port 8080 |
| `just docker-shell` | Open a shell inside the container for debugging |

### GCP Cloud Run

| Recipe | Description |
|---|---|
| `just docker-push` | Build (linux/amd64) and push to Artifact Registry |
| `just cloudrun-deploy` | Deploy current image to Cloud Run (`med-aid-advisor`, europe-west4) |

### shadcn/ui

| Recipe | Description |
|---|---|
| `just add-component <name>` | Add a shadcn/ui component (e.g. `just add-component dialog`) |

### Combo Recipes

| Recipe | Description |
|---|---|
| `just check` | Run lint → typecheck → build (CI gate) |
| `just release` | Run check → push to Artifact Registry → deploy to Cloud Run |

## Project Structure

```
src/
├── components/     # shadcn/ui + app components
├── lib/            # utility functions, cn() helper
├── hooks/          # custom React hooks
public/             # static assets
```

## Environment

No `.env` file is required for local development. For Cloud Run deploys, secrets are managed via GitHub Actions (`WIF_PROVIDER`, `WIF_POOL`, `GCP_SERVICE_ACCOUNT_EMAIL`).
