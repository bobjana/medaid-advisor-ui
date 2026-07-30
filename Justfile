# MedAid Advisor UI — Dev Recipes
# Usage: just [recipe] [args...]
# List all: just --list

# ---- Setup ----

# Install dependencies (clean)
install:
	npm ci

# ---- Development ----

# Start Vite dev server
dev:
	npm run dev

# Start dev server accessible on LAN
dev-host:
	npx vite --host

# ---- Build ----

# Type-check and production build
build:
	npm run build

# Type-check only (no emit)
typecheck:
	npx tsc -b --noEmit

# Preview production build locally
preview:
	npm run preview

# ---- Lint ----

# Run ESLint
lint:
	npm run lint

# Run ESLint with auto-fix
format:
	npx eslint . --fix

# ---- Cleanup ----

# Remove build artifacts
clean:
	rm -rf dist node_modules/.vite *.tsbuildinfo

# Deep clean (remove node_modules too)
clean-all: clean
	rm -rf node_modules

# ---- Docker ----

# Build Docker image locally
docker-build:
	docker build -t medaid-questionnaire:latest .

# Build and run container locally (port 8080)
docker-run: docker-build
	docker run --rm -p 8080:8080 medaid-questionnaire:latest

# Open shell in container for debugging
docker-shell:
	docker run --rm -it --entrypoint sh medaid-questionnaire:latest

# ---- GCP Cloud Run ----

project_id := "med-aid-advisor"
region     := "europe-west4"
service    := "medaid-questionnaire"
ar_repo    := "medaid-repo/medaid-questionnaire"
ar_host    := region + "-docker.pkg.dev"

# Build (linux/amd64) and push to Artifact Registry
docker-push: build
	docker build --platform linux/amd64 -t {{ar_host}}/{{project_id}}/{{ar_repo}}:latest .
	docker push {{ar_host}}/{{project_id}}/{{ar_repo}}:latest

# Deploy to Cloud Run
cloudrun-deploy:
	gcloud run deploy {{service}} \
		--image {{ar_host}}/{{project_id}}/{{ar_repo}}:latest \
		--region {{region}} \
		--project {{project_id}} \
		--allow-unauthenticated \
		--cpu 1 \
		--memory 512Mi

# ---- shadcn/ui ----

# Add a shadcn/ui component
add-component component:
	npx shadcn add {{component}}

# ---- Combos ----

# Full CI: lint + typecheck + build
check: lint typecheck build

# Full release pipeline: check + push + deploy
release: check docker-push cloudrun-deploy
