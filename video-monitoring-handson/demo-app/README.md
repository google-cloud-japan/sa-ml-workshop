# Video Monitoring Demo Appilication

- [デモ動画](https://youtu.be/hayVgEHh6Cw)

## デプロイ手順

- 新規プロジェクトを作成して、Cloud Shell を起動します。
- 次のコマンドを実行して、デモアプリを Cloud Run にデプロイします。
```bash
git clone https://github.com/google-cloud-japan/sa-ml-workshop.git
cd $HOME/sa-ml-workshop/video-monitoring-handson/demo-app
./deploy.sh
```
- デプロイが完了すると次のようにアプリの URL が表示されるので、Web ブラウザで開きます。
```
Application URL: https://demo-video-monitoring-app-xxxxxxxx-uc.a.run.app
```

## デモアプリを利用する際の注意点

- 監視コンソールと音声クライアントが Cloud Run の同じインスタンスに接続するように、クッキーが有効なブラウザを使用してください。（Cloud Run のセッションアフィニティ機能を使用しています。）
- Cloud Run の接続時間制限により、WebSocket 接続は 60 分後に切断されます。デモアプリを使用する直前にバックエンドに再接続してください。（デモアプリには自動再接続機能がありますが、再接続の際にデモが中断される恐れがあります。）
- 監視コンソールと音声クライアントが同一の（仮想の）電話番号（Vitual Phone Number / Security Phone Number）でバックエンドに接続していることを確認してください。
- エージェントの出力音声がマイクから再入力されると、エージェントが混乱する場合があります。[Mic On] [Mic Off] ボタンを利用して、自分が話す時だけマイクをオンにしてください。また、マイクに背後の会話などが入らないように注意してください。

## デモアプリの利用手順

- デモアプリを開くと監視コンソールが表示されます。
- [Open Phone Emulator] をクリックして、音声クライアントの画面を開きます。
- [Connect Backend] をクリックしてバックエンドに接続します。初回の接続時は、バックエンドのコンテナが起動するまで 20 秒程度かかります。

- Virtual Phone Number に表示された（仮想の）電話番号を監視コンソールの Security Phone Number にコピーした後、Customer Name と Customer ID を任意に編集します。また、プルダウンメニューから使用する言語を選択します。
- [Connect] をクリックしてバックエンドに接続します。15 秒程度すると Web カメラの映像を分析した結果が表示されます。この内容は約 15 秒ごとに更新されます。
- 不審な状況を検知すると、Status が「Alert」に変わって、オートコールエージェントに自動通話を開始するリクエストが送信されます。（Status が「Alert」に変わると監視が一時停止します。必要な際は、[Start Monitoring] をクリックして監視を再開してください。）
- テキストボックスに「不審者がいます」などの状況を入力して [Send Request] をクリックすることで、オートコールエージェントにリクエストを送信することもできます。
- オートコールエージェントが自動通話を開始すると、音声クライアントに [Take Call] ボタンが表示されるので、これをクリックしてエージェントとの会話を開始します。[Mic On] [Mic Off] ボタンを利用して、自分が話す時だけマイクをオンにしてください。
- 通話の進行状況が監視コンソールに表示されます。また、通話が終わると通話内容のサマリーが表示されます。
- 典型的なエージェントとの会話の流れは、次のようになります。
  - エージェントが状況を説明して、警備員の派遣を要請します。
  - （オプション）セキュリティカメラに写っている状況について質疑応答をします。
  - 警備員の派遣に同意、もしくは、派遣を拒否します。
  - エージェントが決定内容を復唱して、これであっているか確認を求めるので、あっている旨を返答します。
  - エージェントがお礼を言うので、「どういたしまして」などの返事をすると、エージェントは通話を終了します。
  - （オプション）通話中に [End Call] をクリックして通話を強制終了することもできます。

## デモアプリの主なコード
- `demo-app/frontend/`
  - `component/WebConsole.js` : Web UI の描画（監視コンソール上部）
  - `component/TextChat.js` : Web UI の描画（監視コンソール下部）
  - `lib/monitoring-backend.js` : モニタリングバックエンドとの通信処理
  - `lib/live-video-manager.js` : Web カメラからのデータ取得
  - `component/VoiceClient.js` : Web UI の描画（音声クライアント）
  - `lib/voicecall-backend.js` : オートコールバックエンドとの通信処理
  - `lib/live-audio-manager.js` : 音声データの取得と再生
- `demo-app/monitoring-backend/`
  - `main.py` : 画像データの受信と Gemini API による分析処理
- `demo-app/autocall-backend/`
  - `system_instruction.py` : オートコールエージェントのシステムインストラクション
  - `main.py` : Gemini Live API（ADK Agent）とのデータのやり取り
