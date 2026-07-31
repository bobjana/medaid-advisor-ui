# MedAid Advisor UI — Dev Recipes
# Usage: just [recipe] [args...]
# List all: just --list

# ---- Setup ----

# Install dependencies (clean)
install:
	npm ci

# ---- Development ----

# Start Next.js dev server
dev:
	npm run dev

# ---- Build ----

# Production build
build:
	npm run build

# Type-check only (no emit)
typecheck:
	npm run typecheck

# Start production server (after build)
start:
	npm run start

# ---- Lint ----

# Run ESLint
lint:
	npm run lint

# Run ESLint with auto-fix
format:
	npx eslint . --fix

# ---- Test ----

# Run vitest once
test:
	npm test

# Run vitest in watch mode
test-watch:
	npm run test:watch

# ---- Cleanup ----

# Remove build artifacts
clean:
	rm -rf .next *.tsbuildinfo

# Deep clean (remove node_modules too)
clean-all: clean
	rm -rf node_modules

# ---- Docker ----

# Build Docker image locally
docker-build:
	docker build -t medaid-advisor-ui:latest .

# Build and run container locally (port 8080)
docker-run: docker-build
	docker run --rm -p 8080:8080 medaid-advisor-ui:latest

# Open shell in container for debugging
docker-shell:
	docker run --rm -it --entrypoint sh medaid-advisor-ui:latest

# ---- GCP Cloud Run ----

project_id := "med-aid-advisor"
region     := "europe-west4"
service    := "medaid-advisor-ui"
ar_repo    := "medaid-repo/medaid-advisor-ui"
ar_host    := region + "-docker.pkg.dev"

# Build (linux/amd64) and push to Artifact Registry
docker-push: build
	docker build --platform linux/amd64 -t {{ar_host}}/{{project_id}}/{{ar_repo}}:latest .
	docker push {{ar_host}}/{{project_id}}/{{ar_repo}}:latest

# Deploy to Cloud Run
deploy: docker-push
	gcloud run deploy {{service}} \
		--image={{ar_host}}/{{project_id}}/{{ar_repo}}:latest \
		--region={{region}} \
		--platform=managed \
		--port=8080 \
		--allow-unauthenticated \
		--project={{project_id}}

# Full build + deploy pipeline
ship: deploy

# View recent Cloud Run revisions
revisions:
	gcloud run revisions list --service={{service}} --region={{region}} --project={{project_id}}
