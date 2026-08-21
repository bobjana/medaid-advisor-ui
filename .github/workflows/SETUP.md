# GitHub Actions Deployment to Cloud Run

This repository includes a GitHub Actions workflow that automatically deploys the application to Google Cloud Run when code is pushed to the `main` branch.

## Prerequisites

Before the workflow can run, you need to set up the following in your GitHub repository:

### 1. GCP Workload Identity Federation Setup

This workflow uses GCP Workload Identity Federation for secure authentication. Follow these steps:

#### Step 1: Create a Service Account in GCP

```bash
# Create a service account for GitHub Actions
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer" \
  --project=med-aid-advisor

# Get the service account email
gcloud iam service-accounts describe github-actions-deployer \
  --project=med-aid-advisor \
  --format="value(email)"
```

#### Step 2: Grant Permissions to Service Account

```bash
# Grant roles to the service account
gcloud projects add-iam-policy-binding med-aid-advisor \
  --member="serviceAccount:github-actions-deployer@med-aid-advisor.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding med-aid-advisor \
  --member="serviceAccount:github-actions-deployer@med-aid-advisor.iam.gserviceaccount.com" \
  --role="roles/run.developer"

gcloud projects add-iam-policy-binding med-aid-advisor \
  --member="serviceAccount:github-actions-deployer@med-aid-advisor.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding med-aid-advisor \
  --member="serviceAccount:github-actions-deployer@med-aid-advisor.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

#### Step 3: Create Workload Identity Pool and Provider

```bash
# Create the workload identity pool
gcloud iam workload-identity-pools create github-pool \
  --project=med-aid-advisor \
  --location=global \
  --display-name="GitHub Actions Pool"

# Create the OIDC workload identity provider (GitHub Actions OIDC)
gcloud iam workload-identity-pools providers create-oidc github-provider-ui \
  --project=med-aid-advisor \
  --location=global \
  --workload-identity-pool=github-pool \
  --display-name="GitHub OIDC (UI)" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor" \
  --attribute-condition="assertion.repository=='bobjana/medaid-advisor-ui'"

# Allow the UI repo's GitHub Actions to impersonate the deploy service account
gcloud iam service-accounts add-iam-policy-binding github-actions-deployer@med-aid-advisor.iam.gserviceaccount.com \
  --project=med-aid-advisor \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/84640843558/locations/global/workloadIdentityPools/github-pool/attribute.repository/bobjana/medaid-advisor-ui"
```

#### Step 4: Configure GitHub Secrets

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions → New repository secret):

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `WIF_PROVIDER` | `projects/84640843558/locations/global/workloadIdentityPools/github-pool/providers/github-provider-ui` | Full WIF provider resource name (Step 3) |
| `GCP_SERVICE_ACCOUNT_EMAIL` | `github-actions-deployer@med-aid-advisor.iam.gserviceaccount.com` | Service account email from Step 1 |
| `SESSION_SECRET` | `$(openssl rand -hex 32)` | Random 64-char string; signs session cookies |

### 2. GitHub Repository Settings

Enable Actions in your repository:
1. Go to your repository on GitHub
2. Click Settings → Actions → General
3. Under "Workflow permissions", ensure "Read and write permissions" are enabled
4. Click "Save"

## Workflow Configuration

The workflow `.github/workflows/deploy-cloudrun.yml` includes:

- **Triggers**: Automatically runs on push to `main` branch, or manually via workflow_dispatch
- **Build**: Uses Docker Buildx to create multi-platform images (linux/amd64)
- **Cache**: Caches Docker layers for faster builds
- **Push**: Pushes image to Artifact Registry (europe-west4-docker.pkg.dev)
- **Deploy**: Deploys new revision to Cloud Run service

## Manual Deployment

You can also trigger a deployment manually:

1. Go to Actions tab in your repository
2. Select "Deploy to Cloud Run" workflow
3. Click "Run workflow" button
4. Optionally, select a specific branch

## Deployment URLs

- **Service URL**: https://medaid-advisor-ui-84640843558.europe-west4.run.app
- **GCP Console**: https://console.cloud.google.com/run?project=med-aid-advisor

## Troubleshooting

### Workflow Fails with "Permission denied"
- Verify service account has required roles
- Check Workload Identity Federation configuration
- Ensure GitHub secrets are correctly set

### Build Fails
- Check the Actions logs for specific error messages
- Verify Dockerfile is correct
- Ensure all dependencies are in package.json

### Deployment Fails
- Verify Cloud Run API is enabled
- Check service exists and is healthy
- Review deployment logs in GCP Console
