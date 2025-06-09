#!/bin/bash

export PROJECT_ID=$(gcloud config list --format "value(core.project)")
export REGION="us-central1"
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
REPO_NAME=cloud-run-source-deploy
REPO=${REGION}-docker.pkg.dev/$PROJECT_ID/$REPO_NAME

DEPLOY_BACKEND=true


echo ""
echo "## Enabling APIs..."

services=(
  "aiplatform.googleapis.com"
  "cloudbuild.googleapis.com"
  "run.googleapis.com"
  "cloudresourcemanager.googleapis.com"
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


echo ""
echo "## Deploying the agent..."

if [[ ! -d .venv ]]; then
  python -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt
python _deploy_agent.py
AGENT_ID=$(python _get_agent_id.py)


SERVICE_NAME="a2a-server"
SERVICE_URL="https://${SERVICE_NAME}-${PROJECT_NUMBER}.${REGION}.run.app"

if $DEPLOY_BACKEND; then
  echo ""
  echo "## Deploying the A2A server..."

  pushd a2a_server
  gcloud builds submit --tag ${REPO}/${SERVICE_NAME}
  popd
  gcloud run deploy ${SERVICE_NAME} \
    --image ${REPO}/${SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --no-allow-unauthenticated \
    --update-env-vars "\
PROJECT_ID=${PROJECT_ID},REGION=${REGION},AGENT_ID=${AGENT_ID},\
SERVICE_URL=${SERVICE_URL}"
fi

pushd client
echo "A2A_SERVER_URL=\"$SERVICE_URL\"" >search_agent/.env
if [[ ! -d .venv ]]; then
  python -m venv .venv
fi
source .venv/bin/activate
pip install google-adk==1.2.1 a2a-sdk==0.2.5
popd

echo "Done. To start the chat application, run the following command."
echo "cd client && source .venv/bin/activate && adk web"
