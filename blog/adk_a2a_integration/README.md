# ADK のエージェントとして A2A サーバーを利用するサンプル

## セットアップ手順

### A2A サーバーの準備

Cloud Shell で作業します。

- リポジトリをクローンしてパッケージをインストールします。
```
git clone https://github.com/google-cloud-japan/sa-ml-workshop.git
cd sa-ml-workshop/blog/adk_a2a_integration
python -m venv .venv
source .venv/bin/activate
pip install google-adk==0.5.0 a2a==0.44 a2a-sdk==0.2.4
```

- `server/.env` の内容を修正します。
```
PROJECT_ID='YOUR_PROJEC_ID' # 実際のプロジェクト ID をセットします。
LOCATION='us-central1'
AGENT_URL='http://localhost:10002'
```

- サーバープロセスを起動します。
```
cd server
python a2a_server.py
```

サーバープロセスは起動したままの状態にします。

### エージェントアプリの準備

Cloud Shell の新しいタブを開いて作業します。

```
cd sa-ml-workshop/blog/adk_a2a_integration
source .venv/bin/activate
```
- `client/search_agent/.env` の内容を修正します。

```
PROJECT_ID='YOUR_PROJEC_ID' # 実際のプロジェクト ID をセットします。
LOCATION='us-central1'
AGENT_URL='http://localhost:10002'
```

- エージェントアプリを起動します。

```
cd client
adk web
```
  
