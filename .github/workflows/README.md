# GitHub Actions CI/CD for GCP Cloud Run

Your repository is now configured for automatic deployment to Google Cloud Run!

## Quick Start

### Workload Identity Federation

1. Follow the setup instructions in `.github/workflows/SETUP.md` under "GCP Workload Identity Federation Setup"
2. Add the 3 GitHub secrets to your repository
3. Push to `main` branch - workflow runs automatically

## Workflow Files

- **`deploy-cloudrun.yml`**: Uses Workload Identity Federation (recommended for security)

## What Happens on Push

When you push to the `main` branch:

1. **Checkout**: GitHub Actions checks out your code
2. **Authenticate**: Authenticates to GCP using your configured credentials
3. **Build**: Builds Docker image with Buildx (multi-platform support)
4. **Push**: Pushes image to Artifact Registry with caching
5. **Deploy**: Deploys new revision to Cloud Run

## Manual Deployment

You can also trigger deployments manually:

1. Go to your repository on GitHub
2. Click "Actions" tab
3. Select "Deploy to Cloud Run"
4. Click "Run workflow" button

## Configuration

The following environment variables are set in the workflows:

| Variable | Value | Description |
|----------|-------|-------------|
| `PROJECT_ID` | `med-aid-advisor` | GCP Project ID |
| `REGION` | `europe-west4` | Cloud Run region |
| `SERVICE_NAME` | `medaid-advisor-ui` | Cloud Run service name |
| `IMAGE_NAME` | `medaid-repo/medaid-advisor-ui` | Docker image name |
| `ARTIFACT_REGISTRY` | `europe-west4-docker.pkg.dev` | Artifact Registry URL |

You can modify these values in `.github/workflows/*.yml` if needed.

## Next Steps

1. Follow the setup steps in `.github/workflows/SETUP.md`
2. Add the GitHub secrets
3. Push your changes and verify the workflow runs

## Monitoring

- **GitHub Actions**: Check the Actions tab in your repository for workflow runs
- **Cloud Run Logs**: https://console.cloud.google.com/run?project=med-aid-advisor
- **Service URL**: https://medaid-advisor-ui-84640843558.europe-west4.run.app
