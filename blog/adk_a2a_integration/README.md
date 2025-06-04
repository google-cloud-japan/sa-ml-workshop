# A2A サーバーで動作する ADK のエージェントをリモートの ADK から利用する構成例

## 基礎知識

- [ADK_A2A_integration.pdf](https://github.com/user-attachments/files/20597952/ADK_A2A_integration.pdf)

## アーキテクチャー

![](images/architecture.png)

### クライアント側

- LlmAgent オブジェクトに設定した `before_model_callback` オプションにより、LlmAgent が受け取った `LlmRequest` をコールバック関数 `a2a_remote_call` で処理します。（LLM モデルは使用しません。）
- `LlmRequest` に含まれる（最新の）ユーザーメッセージを A2A クライアントを使って A2A サーバーに送信して、受信したテキストメッセージを `LlmResponse` に含めて返します。
- Session ID を A2A の Context ID として送信することで、A2A サーバーに現在のセッションを特定する情報として利用させます。

### サーバー側

- A2A サーバーは、受け取った情報からユーザーのメッセージを取り出して、内部に用意した Runner オブジェクトに送信します。
- この際、Context ID をサーバー側で管理している Session ID に変換して Runner オブジェクトに渡します。
- A2A サーバーは、Runner オブジェクトが出力した Event オブジェクトを A2A の Artifact オブジェクトに変換して、A2A クライアントに返送します。

以上により、クライアント側の LlmAgent オブジェクトが A2A サーバー側にあるエージェントのプロキシーとして動作して、クライアント側では、通常の LlmAgent オブジェクトとして利用できます。この時、クライアント側とサーバー側で、セッション情報を独立して持つことになるので、それぞれが保持するセッションの情報が一致しない可能性がある点に注意が必要です。

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

## 実行例
  
![](images/screenshot.png)




