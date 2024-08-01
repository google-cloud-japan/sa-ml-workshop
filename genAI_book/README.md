# genAI_book

「Google Cloud で学ぶ生成 AI アプリケーション開発入門」のサンプルコード

Disclaimer: This is not an official Google product

2024/07/31 PaLM API が廃止予定のため Gemini API を使用するようにコードを修正中です。

あわせて、パッケージのバージョンを更新している箇所もあります。

## 変更箇所一覧

### 2.2.2 静的 Web ページ作成
 p.24 ファイル `package.json`
- 変更前
```
  9     "next": "14.0.4",
```
- 変更後
```
  9     "next": "14.2.5",
```

### 3.1.1 Vertex AI StudioでPaLM APIを体験
p.66 本文
- 変更前：「text-bison@002」が安定版の推奨モデルになっていますので、
- 変更後：「gemini-1.5-flash-001」が安定版の推奨モデルになっていますので、

### 3.1.2 Python SDKによるPaLM APIの利用
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
