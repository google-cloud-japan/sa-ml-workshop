# Fashion compliment service - example application

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
cd $HOME/sa-ml-workshop/blog/Fashion-Compliment-App/backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/fashion-compliment-service
gcloud run deploy fashion-compliment-service \
  --image gcr.io/$PROJECT_ID/fashion-compliment-service \
  --platform=managed --region=us-central1 \
  --allow-unauthenticated
```

2. Send a request to the REST API to test the backend.

```
wget -q -O image.jpg \
https://raw.githubusercontent.com/google-cloud-japan/sa-ml-workshop/main/blog/sns_profile_image.jpg

SERVICE_NAME="fashion-compliment-service"
SERVICE_URL=$(gcloud run services list --platform managed \
  --format="table[no-heading](URL)" --filter="metadata.name:${SERVICE_NAME}")

echo {\"image\":\"$(base64 -w0 image.jpg)\", \"lang\":\"en\"} | \
curl -X POST -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
-H "Content-Type: application/json" -d @- \
-s ${SERVICE_URL}/fashion-compliment-service/api/v1/get-compliment| jq .
```

You will see the response similar to the following one.

```
{
  "message": "I am impressed by your presentation skills. You are very articulate and knowledgeable about your subject.
I also like your fashion sense. The blue sweater you are wearing is a great color for you and it complements your shirt
nicely. Your glasses also add to your professional look."
}
```

### Deploy the frontend Web application

1. Add your project to Firebase from [Firebase console](https://console.firebase.google.com/)

2. Initialize the firebase hosting service.

```
cd $HOME/sa-ml-workshop/blog/Fashion-Compliment-App
firebase init hosting -P $PROJECT_ID
```

  Reply to the questions as below.

```
What do you want to use as your public directory? (public) build
Configure as a single-page app (rewrite all urls to /index.html)? N
Set up automatic builds and deploys with GitHub? N
```

3. Open `firebase.json` in the current directory and replace the contents as below.

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
        "source": "/fashion-compliment-service/**",
        "run": {
          "serviceId": "fashion-compliment-service",
          "region": "us-central1"
        }
      }
    ]
  }
}
```

4. Open `src/App.js` and replace `[Project ID]` in the following line with your project ID.

```
const projectId = "[Project ID]";
```

5. Build the frontend web application and deploy to Firebase hosting.

```
yarn install
yarn build
firebase deploy
```

### Test the example application

Open `https://[Project ID].web.app/` (replace `[Project ID]` with your project ID) with a web browser.

Upload your profile photo and get a great compliment for your fashion style!

![screenshot](/blog/Fashion-Compliment-App/screenshot_en.png)

## Shutdown

The deployed web application is accessible from the public internet. To avoid scurity issues, disable the application once you've done the test.

```
cd $HOME/sa-ml-workshop/blog/Fashion-Compliment-App
firebase hosting:disable
```
