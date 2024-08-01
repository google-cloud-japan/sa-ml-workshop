# genAI_book

「Google Cloud で学ぶ生成 AI アプリケーション開発入門」のサンプルコード

Disclaimer: This is not an official Google product

2024/07/31 PaLM API が廃止予定のため Gemini API を使用するようにコードを修正中です。

- PaLM2 と Gemini で API を呼び出すのに使用するモジュールが異なります。
- 使用モデルの変更にあわせて一部のプロンプトを微調整しています。
- 一部のパッケージのバージョンを更新しています。

## 変更箇所一覧
ファイル名は、ディレクトリ `genAI_book` 以下のパスを示します。

### 2.2.2 静的 Web ページ作成
 p.24 ファイル [`TestApp/src/package.json`](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/TestApp/src/package.json)
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

p.66 本文
- 変更前：「text-bison@002」が安定版の推奨モデルになっていますので、
- 変更後：「gemini-1.5-flash-001」が安定版の推奨モデルになっていますので、

### 3.1.2 Python SDK による PaLM API の利用
リポジトリ内のコード変更はありませんが、本文の内容を次のように読み替えてください。

p.74 本文
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

p.75 本文
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

p.76 本文
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

p.77
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

p.79
- 変更前
```
  1 prompt = '''\
  2 「text:」以下の英文をより自然で洗練された英文に書き直した例を3つ示してください。
```
- 変更後
```
  1 prompt = '''\
  2 「text:」以下の英文をより自然で洗練された英文に書き直した例を3つ示してください。書き直した文章のみを出力すること。
```
