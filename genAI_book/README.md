# genAI_book

「Google Cloud で学ぶ生成 AI アプリケーション開発入門」のサンプルコード

Disclaimer: This is not an official Google product

# PaLM 2 から Gemini への移行について
**2025年9月3日記載**

本書では Google Cloud で提供される大規模言語モデル PaLM 2 (text-bison) を使用していますが、今後 PaLM 2 が提供終了の予定となっており、後継の Gemini への移行が必要となります。そのため、このリポジトリ内のコードとノートブックは、Gemini (gemini-2.5-flash-lite) を使用するようにコードの修正が行われています。

書籍に記載のコードをそのまま入力するのではなく、このリポジトリ内のコードをコピーして使用することをお勧めします。

主な変更内容は、次の通りです。
- PaLM 2 と Gemini で API を呼び出す際に使用するモジュールが異なります。
- 使用モデルの変更にあわせて一部のプロンプトとパラメーター値を微調整しています。
- 一部のパッケージのバージョンを更新しています。

※ 使用するモデルが変わったことにより、モデルの応答が書籍の説明と一致しない可能性があります。

出版社のサイトに記載の[正誤表](https://gihyo.jp/book/2024/978-4-297-14171-4/support)もあわせて確認するようにお願いします。

（修正前のコードは、ブランチ [`archive_PaLM_API`](https://github.com/google-cloud-japan/sa-ml-workshop/tree/archive_PaLM_API/genAI_book) に保存してあります。）

## 書籍内容の変更箇所
コードの変更に伴って、書籍の内容を読み替える必要がある部分を示します。
- ファイル名は、ディレクトリ `genAI_book` 以下のパスを示します。
- その方がわかりやすい場合は、変更箇所の前後を含めて記載しています。

### 2.2.2 静的 Web ページ作成
ファイル [`TestApp/src/package.json`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/TestApp/src/package.json)

**p.24**
- 変更前
```
  9     "next": "14.0.4",
```
- 変更後
```
  9     "next": "14.2.5",
```

### 3.1.1 Vertex AI Studio で PaLM API を体験
リポジトリ内のコード変更はありませんが、本文の内容を次のように読み替えてください。

**p.62**
- 変更前：ブラウザから「`https://test-app-xxxxxx-an.a.run.app/wordCount`」にアクセスすると
- 変更後：ブラウザから「`https://test-app-xxxxxx.asia-northeast1.run.app/wordCount`」にアクセスすると

Cloud Run にデプロイしたサービスの URL の末尾が `-an.a.run.pp` から `.asia-northeast1.run.app` に変わっています。これ以降に登場する Cloud Run のサービス URL すべてについて同様に読み替えてください。

**p.66**
- 変更前：「text-bison@002」が安定版の推奨モデルになっていますので、
- 変更後：「gemini-2.5-flash-lite」が安定版の推奨モデルになっていますので、

**p.69**

「文書の分類処理」で説明している「構造化」のボタンが UI から削除されているので、この部分の内容は無視してください。

### 3.1.2 Python SDK による PaLM API の利用
リポジトリ内のコード変更はありませんが、本文の内容を次のように読み替えてください。

**p.74**
- 変更前
```
  1 from vertexai.language_models import TextGenerationModel
  2 generation_model = TextGenerationModel.from_pretrained('text-bison@002')
```
- 変更後
```
  1 from google import genai
  2 [PROJECT_ID] = !gcloud config list --format 'value(core.project)'
  3 client = genai.Client(vertexai=True, project=PROJECT_ID, location='us-central1')
  4 model='gemini-2.5-flash-lite'
```

**p.75**
- 変更前
```
  1 def get_response(prompt):
  2     response = generation_model.predict(
  3         prompt, temperature=0.2, max_output_tokens=1024)
  4     return response
```
- 変更後
```
  1 def get_response(prompt):
  2     response = client.models.generate_content(
  3         model=model,
  4         contents=prompt,
  5         config=genai.types.GenerateContentConfig(
  6             temperature=0.4, max_output_tokens=1024
  7         )
  8     return response.candidates[0].content.parts[-1]
```

`max_output_tokens` オプションの値は最大で `65535` が指定できます。

**p.76**
- 変更前
```
print(response.safety_attributes)
```
- 変更後

Gemini 2.5 では safety_attributes は取得できませんので、この部分は無視してください。

### 3.2.1 ノートブックでのプロトタイピング
ノートブックファイル [`Notebooks/Grammar Correction with PaLM API.ipynb`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/Notebooks/Grammar%20Correction%20with%20PaLM%20API.ipynb)

**p.77**
- 変更前
```
  1 import vertexai
  2 from vertexai.language_models import TextGenerationModel
  3
  4 vertexai.init(location='asia-northeast1')
  5 generation_model = TextGenerationModel.from_pretrained('text-bison@002')
  6
  7 def get_response(prompt, temperature=0.2):
  8     response = generation_model.predict(
  9         prompt, temperature=temperature, max_output_tokens=1024)
 10     return response.text.lstrip()
```
- 変更後
```
  1 import vertexai
  2 from google import genai
  3 
  4 vertexai.init(location='asia-northeast1')
  5 [PROJECT_ID] = !gcloud config list --format 'value(core.project)'
  6 client = genai.Client(vertexai=True, project=PROJECT_ID, location='us-central1')
  7 
  8 def get_response(prompt, temperature=0.2):
  9     response = client.models.generate_content(
 10         model='gemini-2.5-flash-lite',
 10         contents=prompt,
 11         config=genai.types.GenerateContentConfig(
 12             temperature=temperature, max_output_tokens=65535
 13         )
 14     )
 15     return response.candidates[0].content.parts[-1].text
```

**p.79**
- 変更前
```
  2 「text:」以下の英文をより自然で洗練された英文に書き直した例を3つ示してください。
```
- 変更後
```
  2 「text:」以下の英文をより自然で洗練された英文に書き直した例を3つ示してください。書き直した文章のみを出力すること。
```

### 3.2.2 バックエンドの実装
ファイル [`GrammarCorrection/backend/requirements.txt`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/GrammarCorrection/backend/requirements.txt)

**p.81**
- 変更前
```
  2 gunicorn==21.2.0
  3 google-cloud-aiplatform==1.36.1
```
- 変更後
```
  2 gunicorn==22.0.0
  3 google-cloud-aiplatform==1.111.0
```

ファイル [`GrammarCorrection/backend/main.py`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/GrammarCorrection/backend/main.py)

**p.84**
- 変更前
```
  5 from vertexai.language_models import TextGenerationModel
  6
  7 vertexai.init(location='asia-northeast1')
  8 generation_model = TextGenerationModel.from_pretrained('text-bison@002')
...
 12 def get_response(prompt, temperature=0.2):
 13     response = generation_model.predict(
 14         prompt, temperature=temperature, max_output_tokens=1024)
 15     return response.text.lstrip()
```
- 変更後
```
  5 from google import genai, auth
  6
  7 _, PROJECT_ID = auth.default()
  8 vertexai.init(project=PROJECT_ID, location='us-central1')
  9 client = genai.Client(vertexai=True, project=PROJECT_ID, location='us-central1')
 10 app = Flask(__name__)
 11 
 12 
 13 def get_response(prompt, temperature=0.2):
 14     response = client.models.generate_content(
 15         model='gemini-2.5-flash-lite',
 16         contents=prompt,
 17         config=genai.types.GenerateContentConfig(
 18             temperature=temperature, max_output_tokens=1024
 19         )
 20     )
 21     return response.candidates[0].content.parts[-1].text
```

ファイル [`GrammarCorrection/backend/Dockerfile`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/GrammarCorrection/backend/Dockerfile)

**p.86**
- 変更前
```
  3 FROM python:3.8-slim
```
- 変更後
```
  3 FROM python:3.11-slim
```

### 3.3.2 ノートブックでのプロトタイピング
ノートブックファイル [`Notebooks/Fashion Compliment.ipynb`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/Notebooks/Fashion%20Compliment.ipynb)

このノートブックでは、Visual Captioning と Visual QA の API を使用せずにすべての処理を gemini-2.5-flash-lite で処理するように書き換えています。詳細については、ノートブックの内容を参照してください。

### 3.3.3 Web アプリケーションの実装
ファイル [`FashionCompliment/backend/requirements.txt`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/FashionCompliment/backend/requirements.txt)

**p.109**
- 変更前
```
  2 gunicorn==21.2.0
  3 google-cloud-aiplatform==1.36.1
```
- 変更後
```
  2 gunicorn==22.0.0
  3 google-cloud-aiplatform==1.111.0
  4 pillow==11.3.0
```

ファイル [`FashionCompliment/backend/Dockerfile`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/FashionCompliment/backend/Dockerfile)

**p.109**
- 変更前
```
  3 FROM python:3.8-slim
```
- 変更後
```
  3 FROM python:3.11-slim
```

ファイル [`FashionCompliment/backend/main.py`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/FashionCompliment/backend/main.py)

バックエンドのコードでは、すべての処理を gemini-2.5-flash-lite で処理するように書き換えています。詳細はファイルの内容を確認してください。

**本文内のコマンドの変更**

**p.112**

gunicorn を起動する前に、必要なパッケージを pip コマンドでインストールしてください。

- 変更前
```
gunicorn --bind localhost:8080 --reload --log-level debug \
main:app
```
- 変更後
```
pip install -r requirements.txt
gunicorn --bind localhost:8080 --reload --log-level debug \
main:app
```

### 4.1.1 LangChain 入門
ノートブックファイル [`Notebooks/LangChain with PaLM API.ipynb`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/Notebooks/LangChain%20with%20PaLM%20API.ipynb)

**p.125**
- 変更前
```
  1 !pip install --user \
  2   langchain==0.1.0 langchain-google-vertexai==0.0.5 \
  3   google-cloud-aiplatform==1.39.0
```
- 変更後
```
  1 !pip install --user \
  2   langchain==0.3.27 langchain-google-vertexai==2.0.28 \
  3   google-cloud-aiplatform==1.111.0
```

**p.126**
- 変更前
```
 13 次の製品名を考えてください。
 14 製品の説明:{description}
 15 出力:
 16 """
```
- 変更後
```
 13 次の製品名を考えてください。
 14 製品の説明:{description}
 15 """
 16
```

**p.126**
- 変更前
```
  1 from langchain_google_vertexai import VertexAI
  2 llm = VertexAI(model_name='text-bison@002', location='asia-northeast1',
  3                temperature=0.4, max_output_tokens=128)
```
- 変更後
```
  1 from langchain_google_vertexai import VertexAI
  2 llm = VertexAI(model_name='gemini-2.5-flash-lite', location='us-central1',
  3                temperature=0.4, max_output_tokens=128)
```

### 4.1.2 PDF 文書の要約
ノートブックファイル [`Notebooks/PDF Summarization.ipynb`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/Notebooks/PDF%20Summarization.ipynb)

**p.132**
- 変更前
```
  1 !pip install --user \
  2   langchain==0.1.0 transformers==4.36.0 \
  3   pypdf==3.17.0 cryptography==42.0.4 \
  4   langchain-google-vertexai==0.0.5 \
  5   google-cloud-aiplatform==1.39.0
```
- 変更後
```
  1 !pip install --user \
  2   langchain==0.3.27 transformers==4.36.0 \
  3   pypdf==6.0.0 cryptography==42.0.4 \
  4   langchain-google-vertexai==2.0.28 \
  5   google-cloud-aiplatform==1.111.0 \
  6   langchain-community==0.3.29
```

**p.133**
- 変更前
```
  1 from langchain_google_vertexai import VertexAI
  2 llm = VertexAI(model_name='text-bison@002', location='asia-northeast1',
  3                temperature=0.1, max_output_tokens=128)
```
- 変更後
```
  1 from langchain_google_vertexai import VertexAI
  2 llm = VertexAI(model_name='gemini-2.5-flash-lite', location='us-central1',
  3                temperature=0.1, max_output_tokens=1024)
```

**p.135**
- 変更前
```
  1 def get_description(document):
  2     text_splitter = RecursiveCharacterTextSplitter(
  3         chunk_size=4000, chunk_overlap=200)
...
 11     return description['output_text']
```
- 変更後
```
  1 def get_description(document):
  2     text_splitter = RecursiveCharacterTextSplitter(
  3         chunk_size=6000, chunk_overlap=200)
...
 11     return description['output_text'].replace('FINAL ANSWER: ', '')
```

**p.135**
- 変更前
```
  8     prompt = '{} 日本語で200字程度にまとめて教えてください。'.format(question)
```
- 変更後
```
  8     prompt = '{} 日本語で200字程度にまとめて教えてください。マークダウンを使用せずにプレーンテキストで出力。'.format(question)'
```

**p.136**
- 変更前
```
  1     question = 'サイバーセキュリティ対策のポイントを箇条書きにまとめてください。'
```
- 変更後
```
  1     question = 'サイバーセキュリティ対策のポイント９か条を箇条書きにまとめてください。'
```

### 4.2.1 Eventarc によるイベント連携
ファイル [`EventarcTest/requirements.txt`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/EventarcTest/requirements.txt)

**p.141**
- 変更前
```
  2 gunicorn==21.2.0
```
- 変更後
```
  2 gunicorn==22.0.0
```

**本文内のコマンドの変更**

**p.143**

本文中の下記のコマンドで指定するバケット名の末尾を `.appspot.com` から `.firebasestorage.app` に変更します。

- 変更前
```
SERVICE_ACCOUNT=eventarc-trigger@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com
gcloud eventarc triggers create trigger-eventarc-test-service \
  --destination-run-service eventarc-test-service \
  --destination-run-region asia-northeast1 \
  --destination-run-path /api/post \
  --event-filters "type=google.cloud.storage.object.v1.finalized" \
  --event-filters "bucket=$GOOGLE_CLOUD_PROJECT.appspot.com" \
  --location asia-northeast1 \
  --service-account $SERVICE_ACCOUNT
```
- 変更後
```
SERVICE_ACCOUNT=eventarc-trigger@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com
gcloud eventarc triggers create trigger-eventarc-test-service \
  --destination-run-service eventarc-test-service \
  --destination-run-region asia-northeast1 \
  --destination-run-path /api/post \
  --event-filters "type=google.cloud.storage.object.v1.finalized" \
  --event-filters "bucket=$GOOGLE_CLOUD_PROJECT.firebasestorage.app" \
  --location asia-northeast1 \
  --service-account $SERVICE_ACCOUNT
```

**p.144**

本文中の下記のコマンドで指定するバケット名の末尾を `.appspot.com` から `.firebasestorage.app` に変更します。
- 変更前
```
date > /tmp/testfile.txt
gsutil cp /tmp/testfile.txt \
  gs://$GOOGLE_CLOUD_PROJECT.appspot.com/test/testfile.txt
```
- 変更後
```
date > /tmp/testfile.txt
gsutil cp /tmp/testfile.txt \
  gs://$GOOGLE_CLOUD_PROJECT.firebasestorage.app/test/testfile.txt
```

### 4.2.2 Web アプリケーションの実装
ファイル [`SmartDrive/backend/main.py`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/SmartDrive/backend/main.py)

**p.147**
- 変更前
```
 13 llm = VertexAI(
 14     model_name='text-bison@002', location='asia-northeast1',
 15     temperature=0.1, max_output_tokens=1024)
```
- 変更後
```
 13 llm = VertexAI(
 14     model_name='gemini-2.5-flash-lite', location='us-central1',
 15     temperature=0.1, max_output_tokens=1024)
```

**p.150, p.151**
- 変更前
```
 79     text_splitter = RecursiveCharacterTextSplitter(
 80         chunk_size=4000, chunk_overlap=200)
...
 86     description = qa_document_chain.invoke(
 87         {'input_document': document, 'question': prompt})['output_text']
```
- 変更後
```
 79     text_splitter = RecursiveCharacterTextSplitter(
 80         chunk_size=6000, chunk_overlap=200)
...
 86     description = qa_document_chain.invoke(
 87         {'input_document': document, 'question': prompt})['output_text'].replace('FINAL ANSWER: ', '')
```

**本文内のコマンドの変更**

**p.152**

本文中の下記のコマンドで指定するバケット名の末尾を `.appspot.com` から `.firebasestorage.app` に変更します。

- 変更前
```
SERVICE_ACCOUNT=eventarc-trigger@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com
gcloud eventarc triggers create trigger-pdf-summary-service \
  --destination-run-service pdf-summary-service \
  --destination-run-region asia-northeast1 \
  --location asia-northeast1 \
  --event-filters "type=google.cloud.storage.object.v1.finalized" \
  --event-filters "bucket=$GOOGLE_CLOUD_PROJECT.appspot.com" \
  --service-account $SERVICE_ACCOUNT \
  --destination-run-path /api/post
```
- 変更後
```
SERVICE_ACCOUNT=eventarc-trigger@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com
gcloud eventarc triggers create trigger-pdf-summary-service \
  --destination-run-service pdf-summary-service \
  --destination-run-region asia-northeast1 \
  --location asia-northeast1 \
  --event-filters "type=google.cloud.storage.object.v1.finalized" \
  --event-filters "bucket=$GOOGLE_CLOUD_PROJECT.firebasestorage.app" \
  --service-account $SERVICE_ACCOUNT \
  --destination-run-path /api/post
```

**p.153**

本文中の下記のコマンドで指定するバケット名の末尾を `.appspot.com` から `.firebasestorage.app` に変更します。
- 変更前
```
gsutil cp $HOME/genAI_book/PDF/handbook-prologue.pdf \
  gs://$GOOGLE_CLOUD_PROJECT.appspot.com/test/handbook-prologue.pdf
```
- 変更後
```
gsutil cp $HOME/genAI_book/PDF/handbook-prologue.pdf \
  gs://$GOOGLE_CLOUD_PROJECT.firebasestorage.app/test/handbook-prologue.pdf
```

**p.155**

本文中の下記のコマンドで指定するバケット名の末尾を `.appspot.com` から `.firebasestorage.app` に変更します。
- 変更前
```
gsutil cors set cors.json gs://$GOOGLE_CLOUD_PROJECT.appspot.com
```
- 変更後
```
gsutil cors set cors.json gs://$GOOGLE_CLOUD_PROJECT.firebasestorage.app
```

### 5.1.2 ノートブックでのプロトタイピング
ノートブックファイル [`Notebooks/Document QA.ipynb`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/Notebooks/Document%20QA.ipynb)

このノートブックでは、Embedding API を使用せずに、エンベディングモデル gemini-embedding-001 を GenAI API から利用するように書き換えています。詳細については、ノートブックの内容を参照してください。

### 5.2.1 バックエンドの実装確認とデプロイ

ファイル [`DocumentQA/backend/main.py`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/DocumentQA/backend/main.py)

埋め込みベクトルの作成をノートブックで確認した方法（エンベディングモデル gemini-embedding-001 を GenAI API から利用する方法）に変更しています。本文での説明には大きな影響はありませんが、実際のコードと行番号がずれている点に注意してください。

**本文内のコマンドの変更**

**p.182**

本文中の下記のコマンドで指定するバケット名の末尾を `.appspot.com` から `.firebasestorage.app` に変更します。
- 変更前
```
SERVICE_ACCOUNT=eventarc-trigger@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com
gcloud eventarc triggers create trigger-finalized-document-qa-service \
  --destination-run-service document-qa-service \
  --destination-run-region asia-northeast1 \
  --location asia-northeast1 \
  --event-filters "type=google.cloud.storage.object.v1.finalized" \
  --event-filters "bucket=$GOOGLE_CLOUD_PROJECT.appspot.com" \
  --service-account $SERVICE_ACCOUNT \
  --destination-run-path /api/post
```
- 変更後
```
SERVICE_ACCOUNT=eventarc-trigger@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com
gcloud eventarc triggers create trigger-finalized-document-qa-service \
  --destination-run-service document-qa-service \
  --destination-run-region asia-northeast1 \
  --location asia-northeast1 \
  --event-filters "type=google.cloud.storage.object.v1.finalized" \
  --event-filters "bucket=$GOOGLE_CLOUD_PROJECT.firebasestorage.app" \
  --service-account $SERVICE_ACCOUNT \
  --destination-run-path /api/post
```

**p.183**

本文中の下記のコマンドで指定するバケット名の末尾を `.appspot.com` から `.firebasestorage.app` に変更します。
- 変更前
```
SERVICE_ACCOUNT=eventarc-trigger@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com
gcloud eventarc triggers create trigger-deleted-document-qa-service \
  --destination-run-service document-qa-service \
  --destination-run-region asia-northeast1 \
  --location asia-northeast1 \
  --event-filters "type=google.cloud.storage.object.v1.deleted" \
  --event-filters "bucket=$GOOGLE_CLOUD_PROJECT.appspot.com" \
  --service-account $SERVICE_ACCOUNT \
  --destination-run-path /api/post
```
- 変更後
```
SERVICE_ACCOUNT=eventarc-trigger@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com
gcloud eventarc triggers create trigger-deleted-document-qa-service \
  --destination-run-service document-qa-service \
  --destination-run-region asia-northeast1 \
  --location asia-northeast1 \
  --event-filters "type=google.cloud.storage.object.v1.deleted" \
  --event-filters "bucket=$GOOGLE_CLOUD_PROJECT.firebasestorage.app" \
  --service-account $SERVICE_ACCOUNT \
  --destination-run-path /api/post
```
