# Background-Remover-App

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
