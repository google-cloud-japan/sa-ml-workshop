# Background-Remover-App

下記の Blog 記事で紹介した方法を応用して作成した、画像の背景を消去するサンプルアプリケーションです。
- [Vertex AI で GitHub 公開モデルの API サービスを実現！ 〜 画像セグメンテーション編](https://zenn.dev/google_cloud_jp/articles/120d013b65c3af)

### アプリケーションの動作イメージ
![](https://github.com/enakai00/sa-ml-workshop/blob/main/blog/images/background-remover-app.gif)

画像データをバックエンドサービスに直接送信するため、画像サイズが大きいとエラーになる場合があります。


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
