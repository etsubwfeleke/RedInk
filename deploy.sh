#!/usr/bin/env bash

set -euo pipefail

# Deploys latest local code changes for backend and frontend to Cloud Run.
#
# Usage:
#   ./deploy.sh
#   PROJECT_ID=redink-494218 REGION=us-central1 ./deploy.sh
#   ./deploy.sh --backend-only
#   ./deploy.sh --frontend-only

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGION="${REGION:-us-central1}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
BACKEND_SERVICE="${BACKEND_SERVICE:-redink-backend}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-redink-frontend}"
PLATFORM="managed"

DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true

for arg in "$@"; do
  case "$arg" in
    --backend-only)
      DEPLOY_BACKEND=true
      DEPLOY_FRONTEND=false
      ;;
    --frontend-only)
      DEPLOY_BACKEND=false
      DEPLOY_FRONTEND=true
      ;;
    *)
      echo "Unknown argument: $arg"
      echo "Valid arguments: --backend-only | --frontend-only"
      exit 1
      ;;
  esac
done

if [[ -z "$PROJECT_ID" ]]; then
  echo "PROJECT_ID is not set and no default gcloud project is configured."
  echo "Set it like: PROJECT_ID=redink-494218 ./deploy.sh"
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud CLI is required but was not found in PATH."
  exit 1
fi

TAG="$(date +%Y%m%d-%H%M%S)"
BACKEND_IMAGE="gcr.io/${PROJECT_ID}/${BACKEND_SERVICE}:${TAG}"
FRONTEND_IMAGE="gcr.io/${PROJECT_ID}/${FRONTEND_SERVICE}:${TAG}"

echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"

if [[ "$DEPLOY_BACKEND" == true ]]; then
  echo "==> Building backend image with Cloud Build: ${BACKEND_IMAGE}"
  gcloud builds submit "${ROOT_DIR}/backend" \
    --tag "${BACKEND_IMAGE}" \
    --project "${PROJECT_ID}"

  echo "==> Deploying backend service: ${BACKEND_SERVICE}"
  gcloud run deploy "${BACKEND_SERVICE}" \
    --image "${BACKEND_IMAGE}" \
    --platform "${PLATFORM}" \
    --region "${REGION}" \
    --allow-unauthenticated \
    --project "${PROJECT_ID}"
fi

BACKEND_URL="$(gcloud run services describe "${BACKEND_SERVICE}" \
  --region "${REGION}" \
  --platform "${PLATFORM}" \
  --project "${PROJECT_ID}" \
  --format 'value(status.url)')"

if [[ -z "$BACKEND_URL" ]]; then
  echo "Failed to resolve backend URL for service ${BACKEND_SERVICE}."
  exit 1
fi

if [[ "$DEPLOY_FRONTEND" == true ]]; then
  echo "==> Writing frontend API endpoint to .env.production"
  printf 'VITE_API_URL=%s\n' "$BACKEND_URL" > "${ROOT_DIR}/frontend/.env.production"

  echo "==> Building frontend image with Cloud Build: ${FRONTEND_IMAGE}"
  gcloud builds submit "${ROOT_DIR}/frontend" \
    --tag "${FRONTEND_IMAGE}" \
    --project "${PROJECT_ID}"

  echo "==> Deploying frontend service: ${FRONTEND_SERVICE}"
  gcloud run deploy "${FRONTEND_SERVICE}" \
    --image "${FRONTEND_IMAGE}" \
    --platform "${PLATFORM}" \
    --region "${REGION}" \
    --allow-unauthenticated \
    --project "${PROJECT_ID}"
fi

FRONTEND_URL="$(gcloud run services describe "${FRONTEND_SERVICE}" \
  --region "${REGION}" \
  --platform "${PLATFORM}" \
  --project "${PROJECT_ID}" \
  --format 'value(status.url)' 2>/dev/null || true)"

echo
echo "Deployment complete"
echo "Backend URL: ${BACKEND_URL}"
if [[ -n "$FRONTEND_URL" ]]; then
  echo "Frontend URL: ${FRONTEND_URL}"
fi