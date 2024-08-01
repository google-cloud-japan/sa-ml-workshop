# genAI_book

「Google Cloud で学ぶ生成 AI アプリケーション開発入門」のサンプルコード

Disclaimer: This is not an official Google product

# PaLM API から Gemini API への移行について
2024/07/31 PaLM API が廃止予定のため Gemini API を使用するようにコードを修正中です。

主な変更内容は、次の通りです。
- PaLM2 と Gemini で API を呼び出す際に使用するモジュールが異なります。
- 使用モデルの変更にあわせて一部のプロンプトを微調整しています。
- 一部のパッケージのバージョンを更新しています。

## 変更箇所一覧
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

**p.66**
- 変更前：「text-bison@002」が安定版の推奨モデルになっていますので、
- 変更後：「gemini-1.5-flash-001」が安定版の推奨モデルになっていますので、

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
  1 from vertexai import generative_models
  2 generation_model = generative_models.GenerativeModel('gemini-1.5-flash-001')
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
  2     response = generation_model.generate_content(
  3         prompt, generation_config={'temperature': 0.2, 'max_output_tokens': 1024})
  4     return response
```

**p.76**
- 変更前
```
print(response.safety_attributes)
```
- 変更後
```
{str(item.category).split('.')[1]: item.probability_score
 for item in response.candidates[0].safety_ratings}
```

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
  2 from vertexai import generative_models
  3
  4 vertexai.init(location='asia-northeast1')
  5 generation_model = generative_models.GenerativeModel('gemini-1.5-flash-001')
  6
  7 def get_response(prompt, temperature=0.2):
  8     response = generation_model.generate_content(
  9         prompt, generation_config={'temperature': temperature, 'max_output_tokens': 1024})
 10     return response.text.lstrip()
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
  3 google-cloud-aiplatform==1.42.1
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
...
 33     prompt = '''\
 34 「text:」以下の英文をより自然で洗練された英文に書き直した例を3つ示してください。
```
- 変更後
```
  5 from vertexai import generative_models
  6
  7 vertexai.init(location='asia-northeast1')
  8 generation_model = generative_models.GenerativeModel('gemini-1.5-flash-001')
...
 12 def get_response(prompt, temperature=0.2):
 13     response = generation_model.generate_content(
 14         prompt, generation_config={'temperature': temperature, 'max_output_tokens': 1024})
 15     return response.text.lstrip()
...
 33     prompt = '''\
 34 「text:」以下の英文をより自然で洗練された英文に書き直した例を3つ示してください。書き直した文章のみを出力すること。
```

### 3.3.2 ノートブックでのプロトタイピング
ノートブックファイル [`Notebooks/Fashion Compliment.ipynb`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/Notebooks/Fashion%20Compliment.ipynb)

**p.108**
- 変更前
```
  1 from vertexai.language_models import TextGenerationModel
  2 generation_model = TextGenerationModel.from_pretrained('text-bison@002')
...
 16     response = generation_model.predict(
 17         prompt.format(description, items),
 18         temperature=0.2, max_output_tokens=1024)
```
- 変更後
```
  1 from vertexai import generative_models
  2 generation_model = generative_models.GenerativeModel('gemini-1.5-flash-001')
...
 16     response = generation_model.generate_content(
 17         prompt.format(description, items),
 18         generation_config={'temperature': 0.2, 'max_output_tokens': 1024})
```

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
  3 google-cloud-aiplatform==1.42.1
```

ファイル [`FashionCompliment/backend/main.py`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/FashionCompliment/backend/main.py)

**p.110, p.111**
- 変更前
```
  6 from vertexai.language_models import TextGenerationModel
...
 12 generation_model = TextGenerationModel.from_pretrained('text-bison@002')
...
 57     response = generation_model.predict(
 58         prompt.format(description, items),
 59         temperature=0.2, max_output_tokens=1024)
```
- 変更後
```
  6 from vertexai import generative_models
...
 12 generation_model = generative_models.GenerativeModel('gemini-1.5-flash-001')
...
 57     response = generation_model.generate_content(
 58         prompt.format(description, items),
 59         generation_config={'temperature': 0.2, 'max_output_tokens': 1024})
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
  2   langchain==0.1.0 langchain-google-vertexai==0.0.6 \
  3   google-cloud-aiplatform==1.42.1
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
  2 llm = VertexAI(model_name='gemini-1.5-flash-001', location='asia-northeast1',
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
  2   langchain==0.1.0 transformers==4.36.0 \
  3   pypdf==3.17.0 cryptography==42.0.4 \
  4   langchain-google-vertexai==0.0.6 \
  5   google-cloud-aiplatform==1.42.1
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
  2 llm = VertexAI(model_name='gemini-1.5-flash-001', location='asia-northeast1',
  3                temperature=0.1, max_output_tokens=128)
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
  3         chunk_size=10000, chunk_overlap=400)
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

### 4.2.2 Web アプリケーションの実装
ファイル [`FashionCompliment/backend/main.py`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/SmartDrive/backend/main.py)

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
 14     model_name='gemini-1.5-flash-001', location='asia-northeast1',
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
 80         chunk_size=8000, chunk_overlap=400)
...
 86     description = qa_document_chain.invoke(
 87         {'input_document': document, 'question': prompt})['output_text'].replace('FINAL ANSWER: ', '')
```
