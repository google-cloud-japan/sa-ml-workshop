# Fashion compliment service - example application

Disclaimer: This is not an official Google product.

## セットアップ方法

### Google Cloud プロジェクトの作成とリポジトリのクローン

1. [Cloud Console](https://console.cloud.google.com) から新しいプロジェクトを作成して、Cloud Shell を開きます。これ以降のコマンドは、Cloud Shell の端末で実行していきます。
   
2. Cloud Build、Cloud Run、および、Vertex AI の API を有効化します。（`[Project ID]` の部分は、実際のプロジェクト ID に置き換えます。）

```
PROJECT_ID=[Project ID]
gcloud config set project $PROJECT_ID
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  aiplatform.googleapis.com
```

3. このリポジトリをクローンします。

```
cd $HOME
git clone https://github.com/google-cloud-japan/sa-ml-workshop
```
### バックエンドサービスのデプロイ

1. バックエンドサービスをビルドして、Cloud Run にデプロイします。

```
cd $HOME/sa-ml-workshop/blog/Fashion-Compliment-App/backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/fashion-compliment-service
gcloud run deploy fashion-compliment-service \
  --image gcr.io/$PROJECT_ID/fashion-compliment-service \
  --platform=managed --region=us-central1 \
  --allow-unauthenticated
```

2. テスト画像を用いて、バックエンドサービスをテストします。

```
wget -q -O image.jpg \
https://raw.githubusercontent.com/google-cloud-japan/sa-ml-workshop/main/blog/sns_profile_image.jpg

SERVICE_NAME="fashion-compliment-service"
SERVICE_URL=$(gcloud run services list --platform managed \
  --format="table[no-heading](URL)" --filter="metadata.name:${SERVICE_NAME}")

echo {\"image\":\"$(base64 -w0 image.jpg)\"} | \
curl -X POST -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
-H "Content-Type: application/json" -d @- \
-s ${SERVICE_URL}/fashion-compliment-service/api/v1/get-compliment | jq .
```

次のようなメッセージが表示されれば、バックエンドサービスは正しく動いています。

```
{
  "message": "あなたは今日、とても素晴らしいプレゼンテーションをしました。あなたの自信に満ちた態度と、ブルーのセーターとシャツの組み合わせが、あなたのプレゼンテーションを成功に導きました。これからも、あなたの素晴らし いプレゼンテーションを期待しています。"
}
```

### フロントエンド（Web アプリケーション）のデプロイ

1. [Firebase console](https://console.firebase.google.com/) で現在のプロジェクトを登録します。

2. Firebase Hosting のサービスを初期設定します。

```
cd $HOME/sa-ml-workshop/blog/Fashion-Compliment-App
firebase init hosting -P $PROJECT_ID
```

  質問項目には、次の様に答えます。
  
```
What do you want to use as your public directory? (public) build
Configure as a single-page app (rewrite all urls to /index.html)? N
Set up automatic builds and deploys with GitHub? N
```

3. カレントディレクトリに作成された `firebase.json` の内容を以下に書き換えます。

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

4. ファイル `src/App.js` を開いて、先頭付近にある下記の行の `[Project ID]` を実際のプロジェクト ID に書き換えます。

```
const projectId = "[Project ID]";
```

5. Web アプリケーションをビルドして、Firebase Hosting にデプロイします。

```
yarn install
yarn build
firebase deploy
```

### アプリケーションの動作確認

ブラウザで `https://[Project ID].web.app/` を開きます。(`[Project ID]` の部分は実際のプロジェクト ID に置き換えます。）

次のスクリーンショットのように、チャットアプリケーション風の画面が表示されます。[ファイルアップロード] のボタンで人物が写った画像ファイルをアップロードすると、ファッションを褒めるメッセージが表示されます。

![screenshot](/blog/Fashion-Compliment-App/screenshot.png)

## アプリケーションの停止

この Web アプリケーションは、インターネットに公開された状態になっており、誰でも自由にアクセスできます。

**安全のため、動作確認が終わったら、次のコマンドでアプリケーションの公開を停止してください。**

```
cd $HOME/sa-ml-workshop/blog/Fashion-Compliment-App
firebase hosting:disable
```
