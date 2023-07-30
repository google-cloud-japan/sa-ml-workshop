# Grammar correction service - example application

Disclaimer: This is not an official Google product.

## Setup

### Create a new Google Cloud project and clone the repository.

1. Create a new Google Cloud project from [Cloud Console](https://console.cloud.google.com), and open Cloud Shell to execute the following commands.

2. Enable Cloud Build API and Cloud Run API. (replace `[Project ID]` with your project ID.)

```
PROJECT_ID=[Project ID]
gcloud config set project $PROJECT_ID
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  aiplatform.googleapis.com
```

3. Clone the repository.
   
```
cd $HOME
git clone https://github.com/google-cloud-japan/sa-ml-workshop
```
### Deploy the backend service.

1. Build and deploy the backend service to Cloud Run.

```
cd $HOME/sa-ml-workshop/LLM-Grammar-Service-APP/backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/grammar-service
gcloud run deploy grammar-service \
  --image gcr.io/$PROJECT_ID/grammar-service \
  --platform=managed --region=us-central1 \
  --allow-unauthenticated
```

2. Send a request to the REST API to test the backend.

```
SERVICE_NAME="grammar-service"
SERVICE_URL=$(gcloud run services list --platform managed \
  --format="table[no-heading](URL)" --filter="metadata.name:${SERVICE_NAME}")
curl -X POST -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d '{"text":"I go to school yesterday. I eat apple for lunch. I like to eat apple."}' \
  -s ${SERVICE_URL}/grammar-service/api/v1/correction | jq .
```

You will see the response similar to the following one.

```
{
  "corrected": "I went to school yesterday. I ate an apple for lunch. I like to eat apples.",
  "samples": "- Yesterday, I went to school and had an apple for lunch. I enjoy eating apples.\n- I enjoyed a delicious apple for lunch yesterday at school.\n- Yesterday, I had the pleasure of enjoying an apple for lunch at school."
}
```

### Deploy the frontend Web application

1. Initialize the firebase hosting service.

```
cd $HOME/sa-ml-workshop/LLM-Grammar-Service-APP
firebase init hosting
```

Select `Add Firebase to an existing Google Cloud Platform project` to select your project, and reply to the questions as below.

```
What do you want to use as your public directory? (public) build
Configure as a single-page app (rewrite all urls to /index.html)? N
Set up automatic builds and deploys with GitHub? N
```

2. Open `firebase.json` in the current directory and replace the contents as below.

```
{
  "hosting": {
    "public": "build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/grammar-service/**",
        "run": {
          "serviceId": "grammar-service",
          "region": "us-central1"
        }
      }
    ]
  }
}
```

3. Open `src/App.js` and replace `[Project ID]` in the following line with your project ID.

```
const projectId = "[Project ID]";
```

4. Build the frontend web application and deploy to Firebase hosting.

```
yarn install
yarn build
firebase deploy
```

### Test the example application

Open `https://[Project ID].web.app/` (replace `[Project ID]` with your project ID) with a web browser.

As in the following screenshot, input some (grammatically incorrect) English text and click the "Correct me!" button.
A new text with grammar correction and three model sentences will appear on the screen.

![screenshot](/LLM-Grammar-Service-APP/screenshot.png)

## Shutdown

The deployed web application is accessible from the public internet. To avoid scurity issues, disable the application once you've done the test.

```
cd $HOME/sa-ml-workshop/LLM-Grammar-Service-APP
firebase hosting:disable
```
