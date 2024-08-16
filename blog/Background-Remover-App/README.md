# Background-Remover-App

下記の Blog 記事で紹介した方法を応用して作成した、画像の背景を消去するサンプルアプリケーションです。
- [Vertex AI で GitHub 公開モデルの API サービスを実現！ 〜 画像セグメンテーション編](https://zenn.dev/google_cloud_jp/articles/120d013b65c3af)

### アプリケーションの動作イメージ
![](https://github.com/enakai00/sa-ml-workshop/blob/main/blog/images/background-remover-app.gif)

## アーキテクチャー

![](https://github.com/enakai00/sa-ml-workshop/blob/main/blog/images/background-remover-architecture.png)

**[注意]**

- 画像データをバックエンドサービスに直接送信しているため、画像サイズが大きいとエラーになる場合があります。
- この問題を避けるには、処理前後の画像データは Cloud Storage に保存して、画像ファイルの URI を API のリクエスト／レスポンスに含める方法が考えられます。Firebase を利用すると、クライアントから Cloud Storage のバケットにアクセスするほか、認証機能などを簡単追加する事ができます。Firebase を用いた生成 AI アプリケーションの開発は次の書籍が参考になります。
  - [Google Cloudで学ぶ生成AIアプリ開発入門](https://gihyo.jp/book/2024/978-4-297-14171-4)

## デプロイ手順

新規プロジェクトを作成して、Cloud Shell から以下のコマンドを実行します。

**[注意]**
- Cloud Shell のホームディレクトリ `/home` に 3G 程度の空き容量があることを事前に確認してください。
- デプロイ用のスクリプトはサンプルとして提供するもので、実行中のエラー対応などは十分に実装されていません。実行中にエラーが発生した場合は、スクリプトの内容を参照して対応してください。

### リポジトリのクローン
```
cd $HOME
git clone https://github.com/google-cloud-japan/sa-ml-workshop.git
```
### Vertex AI Online prediction のバックエンドをデブロイ
```
cd $HOME/sa-ml-workshop/blog/Background-Remover-App/
./build-backend.sh
```
**[注意]**
- バックエンドのデプロイには全体で 60 分程度かかります。
- 特に最後のモデルのデプロイ処理に 30 分以上かかると下記のエラーメッセージが表示されます。そのような場合は、クラウドコンソールの「Vertex AI」→「オンライン予測」の画面でエンドポイント名 `bg-remover-ep` をクリックするとエンドポイントのステータスが確認できます。ステータスが「デプロイ中」の場合は、そのままデプロイが完了して「準備完了」になるのを待ってから、次の作業に進んでください。
```
ERROR: (gcloud.ai.endpoints.deploy-model) Operation https://asia-northeast1-aiplatform.googleapis.com/v1beta1/projects...
has not finished in 1800 seconds. The operations may still be underway remotely and may still succeed;
use gcloud list and describe commands or https://console.developers.google.com/ to check resource state.
```

### フロントエンドアプリケーションをデプロイ
```
cd $HOME/sa-ml-workshop/blog/Background-Remover-App/
./build-app.sh
```

## クリーンアップ

不要な課金を避けるためにテストが終わったら、使用したプロジェクトをシャットダウンしてください。


