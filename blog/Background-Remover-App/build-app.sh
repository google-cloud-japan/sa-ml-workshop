#!/bin/bash

. setenv.sh

PROJECT_ID=$(gcloud config list --format 'value(core.project)')
REPO=$LOCATION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME

echo "* Checking if an application image exists."
gcloud artifacts docker images describe $REPO/$APP_IMAGE 2>/dev/null
rc=$?
if [[ $rc != 0 ]]; then
  echo "Building an application image."
  pushd src
  endpoint_name=$(gcloud ai endpoints list \
    --project=$PROJECT_ID --region=$LOCATION \
    --format json | jq ".[] | select(.displayName==\"$ENDPOINT_NAME\")" |\
    jq .name | head -1)

  cat >.env.local <<EOF
MODEL_ENDPOINT=$endpoint_name
API_ENDPOINT="$LOCATION-aiplatform.googleapis.com"
EOF
  gcloud builds submit . --tag $REPO/$APP_IMAGE
  popd
fi


echo "* Checking if a service account exists."
service_account=$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com
gcloud iam service-accounts describe $service_account 2>/dev/null
rc=$?
if [[ $rc != 0 ]]; then
  echo "Creating a service account."
  gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member serviceAccount:$service_account \
    --role roles/aiplatform.user

  echo "Wait 60 seconds for ACLs to be propagated."
  sleep 60
fi


echo "* Checking if a frontend application is deployed."
gcloud run services describe $SERVICE_NAME --region=$LOCATION 2>/dev/null
rc=$?
if [[ $rc != 0 ]]; then
  echo "Deploying a frontend application."
  gcloud run deploy $SERVICE_NAME \
    --image $REPO/$APP_IMAGE \
    --service-account $service_account \
    --region $LOCATION --allow-unauthenticated
fi

echo "Done."
