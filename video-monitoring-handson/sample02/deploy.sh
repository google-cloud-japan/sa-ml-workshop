#!/bin/bash

PROJECT_ID=$(gcloud config list --format "value(core.project)")
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
REGION=us-central1
REPO_NAME=cloud-run-source-deploy
REPO=${REGION}-docker.pkg.dev/$PROJECT_ID/$REPO_NAME

DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true


echo ""
echo "## Enabling APIs..."

services=(
  "aiplatform.googleapis.com"
  "cloudbuild.googleapis.com"
  "run.googleapis.com"
)
services_list="(""$(IFS='|'; echo "${services[*]}")"")"
enabled=$(gcloud services list --format json | jq .[].config.name |\
  grep -E "$services_list" | wc -l)
if [[ $enabled != ${#services[@]} ]]; then
  echo "Enabling APIs."
  services_list="$(IFS=' '; echo "${services[*]}")"
  gcloud services enable $services_list

  echo "Wait 10 seconds for APIs to be ready."
  sleep 10
fi


echo ""
echo "## Creating the image repository..."

gcloud artifacts repositories describe \
  --location $REGION $REPO_NAME 1>/dev/null 2>&1
rc=$?
if [[ $rc != 0 ]]; then
  gcloud artifacts repositories create $REPO_NAME \
    --repository-format docker --location $REGION
fi  


if [[ $DEPLOY_BACKEND ]]; then
  echo ""
  echo "## Deploying backend..."

  SERVICE_ACCOUNT=video-monitoring-backend-sa@${PROJECT_ID}.iam.gserviceaccount.com
  gcloud iam service-accounts list --format json | jq .[].email |\
    grep -E "\"$SERVICE_ACCOUNT\"" 1>/dev/null 2>&1
  rc=$?

  if [[ $rc != 0 ]]; then
    gcloud iam service-accounts create video-monitoring-backend-sa \
      --display-name "Service Account for Video Monitoring Backend"
    sleep 10

    gcloud projects add-iam-policy-binding $PROJECT_ID \
      --role roles/aiplatform.user \
      --member=serviceAccount:$SERVICE_ACCOUNT

    echo "Wait 60 seconds for ACLs to be propagated."
    sleep 60
  fi
fi
  
if $DEPLOY_BACKEND; then
  pushd backend
  gcloud run deploy sample02-backend --source . \
    --region $REGION \
    --allow-unauthenticated \
    --service-account $SERVICE_ACCOUNT \
    --timeout=3600
  popd
fi

BACKEND_URL=$(gcloud run services list --format json | \
  jq .[].status.url | grep -E "sample02-backend.*\.run\.app" | sed s/\"//g)


if $DEPLOY_FRONTEND; then
  echo ""
  echo "## Deploying frontend..."

  SERVICE_ACCOUNT=video-monitoring-app-sa@${PROJECT_ID}.iam.gserviceaccount.com
  gcloud iam service-accounts list --format json | jq .[].email |\
    grep -E "\"$SERVICE_ACCOUNT\"" 1>/dev/null 2>&1
  rc=$?

  if [[ $rc != 0 ]]; then
    gcloud iam service-accounts create video-monitoring-app-sa \
      --display-name "Service Account for Video Monitoring App"
    sleep 10
  fi

  pushd frontend
  echo "NEXT_PUBLIC_BACKEND_URL=\"${BACKEND_URL//https/wss}/ws\"" > .env.local
  gcloud run deploy sample02-app --source . \
    --region $REGION \
    --allow-unauthenticated \
    --service-account $SERVICE_ACCOUNT
  popd
fi

APP_URL=$(gcloud run services list --format json | \
  jq .[].status.url | grep -E "sample02-app-.*\.run\.app" | sed s/\"//g)

echo ""
echo "Done."
echo "Application URL: $APP_URL"
