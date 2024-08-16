#!/bin/bash

. setenv.sh

PROJECT_ID=$(gcloud config list --format 'value(core.project)')
REPO=$LOCATION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME

echo "* Checking if APIs are enabled."
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
  curl -X POST -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://us-central1-aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/us-central1/endpoints \
  -d ""
fi


echo "* Checking if a repository exists."
gcloud artifacts repositories describe \
  --location $LOCATION $REPO_NAME 2>/dev/null
rc=$?
if [[ $rc != 0 ]]; then
  echo "Creating repository $REPO_NAME."
  gcloud artifacts repositories create $REPO_NAME \
    --repository-format docker --location $LOCATION

  echo "Wait 60 seconds for ACLs to be propagated."
  sleep 60
fi    


echo "* Checking if a backend image exists."
gcloud artifacts docker images describe $REPO/$BACKEND_IMAGE 2>/dev/null
rc=$?
if [[ $rc != 0 ]]; then
  echo "Building a backend image."
  pushd backend/build
  wget -qO app/sam2_hiera_large.pt \
    https://dl.fbaipublicfiles.com/segment_anything_2/072824/sam2_hiera_large.pt
  gcloud builds submit . --tag $REPO/$BACKEND_IMAGE
  popd
fi


echo "* Checking if an endpoint exists."
endpoint_name=$(gcloud ai endpoints list \
  --project=$PROJECT_ID --region=$LOCATION \
  --format json | jq ".[] | select(.displayName==\"$ENDPOINT_NAME\")" |\
  jq .name | head -1)
if [[ $endpoint_name == "" ]]; then
  echo "Creating an endpoint."
  gcloud ai endpoints create \
    --project=$PROJECT_ID --region=$LOCATION \
    --display-name=$ENDPOINT_NAME
fi


echo "* Checking if a model is uploaded."
model_name=$(gcloud ai models list \
  --project=$PROJECT_ID --region=$LOCATION \
  --format json | jq ".[] | select(.displayName==\"$MODEL_NAME\")" |\
  jq .name | head -1)
if [[ $model_name == "" ]]; then
  echo "Uploading the model."
  gcloud ai models upload \
    --project=$PROJECT_ID --region=$LOCATION \
    --container-image-uri=$REPO/$BACKEND_IMAGE \
    --display-name=$MODEL_NAME
fi


endpoint_name=$(gcloud ai endpoints list \
  --project=$PROJECT_ID --region=$LOCATION \
  --format json | jq ".[] | select(.displayName==\"$ENDPOINT_NAME\")" |\
  jq .name | head -1)
endpoint_id=$(echo $endpoint_name | grep -oP '(?<=/)([^/]*)(?=")')
model_name=$(gcloud ai models list \
  --project=$PROJECT_ID --region=$LOCATION \
  --format json | jq ".[] | select(.displayName==\"$MODEL_NAME\")" |\
  jq .name | head -1)
model_id=$(echo $model_name | grep -oP '(?<=/)([^/]*)(?=")')


echo "* Checking if a model is deployed."
deployedModel=$(gcloud ai endpoints describe $endpoint_id \
  --project=$PROJECT_ID --region=$LOCATION --format json |\
  jq .deployedModels[0].model)
if [[ $deployedModel != $model_name ]]; then
  echo "Deploying the model."
  gcloud ai endpoints deploy-model $endpoint_id \
    --project=$PROJECT_ID --region=$LOCATION \
    --model=$model_id \
    --display-name=$MODEL_NAME \
    --machine-type=n1-standard-4 \
    --min-replica-count=1 --max-replica-count=1 \
    --accelerator=count=1,type=nvidia-tesla-t4 \
    --traffic-split=0=100
fi

echo "Done."
