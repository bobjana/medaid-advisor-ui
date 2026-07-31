# MedAid Advisor UI — Dev Recipes
# Usage: just [recipe] [args...]
# List all: just --list

# ---- Setup ----

# Install dependencies from lockfile (CI-friendly)
install:
	npm ci

# Wipe node_modules and install fresh
install-fresh:
	rm -rf node_modules
	npm install

# ---- Development ----

# Start Next.js dev server (http://localhost:3000)
dev:
	npm run dev

# ---- Build ----

# Next.js production build (writes .next/standalone)
build:
	npm run build

# Type-check only (no emit)
typecheck:
	npm run typecheck

# Start the production server (after build)
start:
	npm run start

# ---- Quality Gates ----

# Run ESLint
lint:
	npm run lint

# Run ESLint with --fix
format:
	npx eslint . --fix

# Run the test suite once
test:
	npm test

# Run the test suite in watch mode
test-watch:
	npm run test:watch

# Run every gate: typecheck + lint + test
check: typecheck lint test

# ---- Cleanup ----

# Remove build artifacts
clean:
	rm -rf .next tsconfig.tsbuildinfo

# Deep clean (also remove node_modules)
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
docker-push: docker-build
	docker build --platform linux/amd64 -t {{ar_host}}/{{project_id}}/{{ar_repo}}:latest .
	docker push {{ar_host}}/{{project_id}}/{{ar_repo}}:latest

# Deploy the latest pushed image to Cloud Run
deploy:
	gcloud run deploy {{service}} \
		--image={{ar_host}}/{{project_id}}/{{ar_repo}}:latest \
		--region={{region}} \
		--platform=managed \
		--port=8080 \
		--allow-unauthenticated \
		--project={{project_id}}

# Build, push, and deploy in one go
ship: docker-push deploy

# Stream Cloud Run logs (Ctrl-C to stop)
logs:
	gcloud run services logs tail {{service}} --region={{region}} --project={{project_id}}

# Open the deployed service in the default browser
open:
	gcloud run services describe {{service}} --region={{region}} --project={{project_id}} --format='value(status.url)' | xargs open

# List recent Cloud Run revisions
revisions:
	gcloud run revisions list --service={{service}} --region={{region}} --project={{project_id}}
