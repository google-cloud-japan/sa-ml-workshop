# Background-Remover-App

下記の Blog 記事で紹介した方法を応用して作成した、画像の背景を消去するサンプルアプリケーションです。
- [Vertex AI で GitHub 公開モデルの API サービスを実現！ 〜 画像セグメンテーション編](https://zenn.dev/google_cloud_jp/articles/120d013b65c3af)

### アプリケーションの動作イメージ
![](https://github.com/enakai00/sa-ml-workshop/blob/main/blog/images/background-remover-app.gif)

## アーキテクチャー

![](https://github.com/enakai00/sa-ml-workshop/blob/main/blog/images/background-remover-architecture.png)

**[注意]**

- 画像データをバックエンドサービスに直接送信しているため、画像サイズが大きいとエラーになる場合があります。
- この問題を避けるには、処理前後の画像データは Cloud Storage に保存して、画像ファイルの URI を API のリクエスト／レスポンスに含める方法が考えられます。Firebase を利用すると、クライアントから Cloud Storage のバケットにアクセスするほか、認証機能などを簡単追加する事ができます。
- Firebase を用いた生成 AI アプリケーションの開発は次の書籍が参考になります。
  - [Google Cloudで学ぶ生成AIアプリ開発入門](https://gihyo.jp/book/2024/978-4-297-14171-4)

## デプロイ手順

新規プロジェクトを作成して、Cloud Shell から以下のコマンドを実行します。

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
バックエンドのデプロイには 60 分程度かかります。

### フロントエンドアプリケーションをデプロイ
```
cd $HOME/sa-ml-workshop/blog/Background-Remover-App/
./build-app.sh
```
