export class AutocallBackendAPI {
  constructor(backendUrl) {
    this.backendUrl = backendUrl;

    this.onReceiveResponse = (message) => {  // callback setup later
      console.log("Default message received callback", message);
    };
    this.onConnectionClosed = () => {};      // callback setup later

    this.phoneId = "";
    this.webSocket = null;
  }

  setPhoneId(phoneId) {
    this.phoneId = phoneId;
  }

  // status checker
  isConnected() {
    if (this.webSocket === null) return false;
    if (this.webSocket.readyState === 1) return true;
    return false;
  }

  isClosed() {
    if (this.webSocket === null) return true;
    if (this.webSocket.readyState === 2) return true;
    if (this.webSocket.readyState === 3) return true;
    return false;
  }

  // connect and disconnect
  connect() {
    let connectionUrl = this.backendUrl;
    if (this.phoneId != "") { 
       connectionUrl += "/" + this.phoneId;
    }
    console.log("connecting: ", connectionUrl);

    this.webSocket = new WebSocket(connectionUrl);

    this.webSocket.onclose = (event) => {
      console.log("websocket closed: ", event);
      this.onConnectionClosed();
    };

    this.webSocket.onerror = (event) => {
      console.log("websocket error: ", event);
    };

    this.webSocket.onmessage = this.onReceiveMessage.bind(this);
  }

  disconnect() {
    if (this.webSocket === null) return;
    this.webSocket.close();
  }

  // receive a message
  onReceiveMessage(messageEvent) {
    console.log("Message received: ", messageEvent);
    const messageData = JSON.parse(messageEvent.data);
    this.onReceiveResponse(messageData);
  }

  // send a message
  sendMessage(message) {
    if (this.webSocket === null) return;
    this.webSocket.send(JSON.stringify(message));
  }

  sendTextMessage(text, session_id) {
    const message = {
      type: 'text',
      data: text,
      session_id: session_id,
    };
    this.sendMessage(message);
  }

  sendAudioMessage(base64PCM) {
    const message = {
      type: 'audio',
      data: base64PCM,
      mime_type: 'audio/pcm',
    };
    this.sendMessage(message);
  }

  sendImageMessage(base64Image, mime_type="image/jpeg") {
    const message = {
      type: 'image',
      data: base64Image,
      mime_type: mime_type,
    };
    this.sendMessage(message);
  }
}
