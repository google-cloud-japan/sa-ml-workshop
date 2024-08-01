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
