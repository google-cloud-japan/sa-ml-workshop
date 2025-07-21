import { useState, useRef, useEffect } from "react";
import { AutocallBackendAPI } from "lib/autocall-backend";
import {
  LiveAudioInputManager,
  LiveAudioOutputManager
} from "lib/live-audio-manager";


export default function PhoneEmulator() {

  const BACKEND_URL = process.env.NEXT_PUBLIC_AUTOCALL_BACKEND_URL;
  const generateRandomPhoneNumber = () => {
    const part1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const part2 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const part3 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${part1}-${part2}-${part3}`;
  }
  const sleep = (time) => new Promise((r) => setTimeout(r, time));

  const [newModelMessage, setNewModelMessage] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [phoneStatus, setPhoneStatus] = useState("off");  // off, ringing, on
  const [micStatus, setMicStatus] = useState("off");
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [phoneId, setPhoneId] = useState(generateRandomPhoneNumber());
  const [sessionId, setSessionId] = useState("");
  const [reconnectTimerId, setReconnectTimerId] = useState(null);
  const _liveAudioOutputManager = useRef();
  const _liveAudioInputManager = useRef();
  const liveAudioOutputManager = _liveAudioOutputManager.current;
  const liveAudioInputManager = _liveAudioInputManager.current;

  let reconnectDelay = 1000;
  const MAX_RECONNECT_DELAY = 30000;

  useEffect(() => {
    _liveAudioInputManager.current = new LiveAudioInputManager();
    _liveAudioOutputManager.current = new LiveAudioOutputManager();
  }, []); 

  useEffect(() => {
    if (phoneStatus === "on") {
      startAudioInput();
//      startAudioStream();
      sendTextMessage("[connection established]");
    } else if (phoneStatus === "off") {
      stopAudioStream();
      stopAudioInput();
      sendTextMessage("[connection closed]");
    }
  }, [phoneStatus]);

  useEffect(() => {
    if (micStatus === "on") {
      startAudioStream();
    } else {
      const _stopAudioStream = async () => {
        await sleep(2000); // wait for finishing sending audio data.
        stopAudioStream();
      };
      _stopAudioStream();
    }
  }, [micStatus]);

  const _autocallApi = useRef(
    new AutocallBackendAPI(BACKEND_URL + '/voice_client')
  );
  const autocallApi = _autocallApi.current;

  autocallApi.onErrorMessage = (message) => {
    console.log(message);
  };

  const startAudioInput = async () => {
    if (!liveAudioInputManager) return;
    await liveAudioInputManager.connectMicrophone();
  };

  const stopAudioInput = async () => {
    if (!liveAudioInputManager) return;
    await liveAudioInputManager.disconnectMicrophone();
  };

  const startAudioStream = () => {
    if (!autocallApi.isConnected) return;
    liveAudioInputManager.onNewAudioRecordingChunk = (audioData) => {
      console.log("send audio data");
      autocallApi.sendAudioMessage(audioData);
    };
  }

  const stopAudioStream = () => {
    if (!liveAudioInputManager) return;
    liveAudioInputManager.onNewAudioRecordingChunk = () => {};
  }

  const manualConnect = async () => {
    autocallApi.onConnectionClosed = () => {}; // Don't reconnect for the first try.
    clearTimeout(reconnectTimerId);
    connect();
  }

  const manualDisconnect = async () => {
    autocallApi.onConnectionClosed = () => {}; // Disable reconnect handler.
    clearTimeout(reconnectTimerId);
    disconnect();
  }

  const connect = async () => {
    setButtonDisabled(true);
    clearTimeout(reconnectTimerId);
    autocallApi.setPhoneId(phoneId);
    autocallApi.connect();

    while (!autocallApi.isConnected()) {
      await sleep(500);
      if (autocallApi.isClosed()) {
        disconnect();
        return;
      }
    }

    // Set reconnect handler.
    console.log("Setting reconnect handler.");
    reconnectDelay = 1000;
    autocallApi.onConnectionClosed = () => {
      setConnectionStatus("disconnected");
      setButtonDisabled(true);
      console.log(`Attempting to reconnect in ${reconnectDelay / 1000}s.`);
      const _reconnectTimerId = setTimeout(() => {
        console.log("Reconnecting...");
        connect();
      }, reconnectDelay);
      setReconnectTimerId(_reconnectTimerId);

      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    };

    setButtonDisabled(false);
    setConnectionStatus("connected");
  };

  const disconnect = async () => {
    setButtonDisabled(true);
    await sleep(200);
    await autocallApi.disconnect();
    await sleep(800);
    setButtonDisabled(false);
    setConnectionStatus("disconnected");
    setPhoneStatus("off");
  };


  autocallApi.onReceiveResponse = (messageResponse) => {
    if (messageResponse.type == "text") {
      console.log("text data received.", messageResponse);
      const command = messageResponse.command;	    
      const phone_id = messageResponse.phone_id;
      const session_id = messageResponse.session_id;
      if (command == "phone_id") {
        setPhoneId(phone_id);
        console.log("phone_id: ", phone_id);
        return;
      } 
      if (phone_id != phoneId) return;
      if (command == "call") {
        setSessionId(session_id);
        setPhoneStatus("ringing");
      } else if (command == "disconnect") {
        setPhoneStatus("off");
      }
      return;
    }
    if (messageResponse.type == "audio" && phoneStatus == "on") {
      console.log("auido data received.")
      const audioChunk = messageResponse.data;
      liveAudioOutputManager.playAudioChunk(audioChunk);
    }
  };


  const sendTextMessage = (message) => {
    console.log("Sending text to live API: ", message)
    autocallApi.sendTextMessage(message, sessionId);
  };


  let connectButton;
  if (buttonDisabled) {
    connectButton = (
      <button className="bg-gray-400
                         text-white font-bold py-2 px-4 rounded">
	    {(connectionStatus == "connected") ? "Disconnect Backend" : "Connect Backend"}</button>
    );
  } else if (connectionStatus == "connected") {
    connectButton = (
      <button className="bg-red-500 hover:bg-red-600
                         text-white font-bold py-2 px-4 rounded"
              onClick={manualDisconnect}>Disconnect Backend</button>
    );
  } else {
    connectButton = (
      <button className="bg-green-500 hover:bg-green-600
                         text-white font-bold py-2 px-4 rounded"
              onClick={manualConnect}>Connect Backend</button>
    );
  }

  let phoneButton;
  if (phoneStatus == "ringing") {
    phoneButton = (
      <button className="bg-green-500 hover:bg-green-600
                         text-white font-bold py-2 px-4 rounded"
              onClick={() => setPhoneStatus("on")}>Take Call</button>
    );
  } else if (phoneStatus == "on") {
    phoneButton = (
      <button className="bg-red-500 hover:bg-red-600
                         text-white font-bold py-2 px-4 rounded"
              onClick={() => setPhoneStatus("off")}>End Call</button>
    );
  } else {
    phoneButton = (<></>);
  }
  if (connectionStatus != "connected") phoneButton = (<></>);


  let micButton;
  if (micStatus == "on") {
    micButton = (
      <button className="bg-red-500 hover:bg-red-600
                         text-white font-bold py-2 px-4 rounded"
              onClick={() => setMicStatus("off")}>Mic Off</button>
    );
  } else {
    micButton = (
      <button className="bg-green-500 hover:bg-green-600
                         text-white font-bold py-2 px-4 rounded"
              onClick={() => setMicStatus("on")}>Mic On</button>
    );
  }
  if (phoneStatus != "on") {
    micButton = (<></>);
  }

  let phoneIcon;
  if (phoneStatus == "ringing") {
    const phoneEmoji = String.fromCodePoint(0x1F4F2);
    phoneIcon = (
      <div className="text-8xl font-bold text-gray-800">{phoneEmoji}</div>
    );
  } else if (phoneStatus == "on") {
    const phoneEmoji = String.fromCodePoint(0x1F4F1);
    phoneIcon = (
      <div className="text-8xl font-bold text-gray-800">{phoneEmoji}</div>
    );
  } else {
    const phoneEmoji = String.fromCodePoint(0x1F4F1);
    phoneIcon = (
      <div className="grayscale text-8xl font-bold text-gray-800">{phoneEmoji}</div>
    );

  }

  let phoneIdField;
  if (connectionStatus == "connected") {
    phoneIdField = (
      <textarea readOnly
                className="w-48 h-12 p-2.5 mb-5 border
                           border-[#333333] rounded-[3px] resize-none"
                value={phoneId} />
    );
  } else {
    phoneIdField = (
      <textarea className="w-48 h-12 p-2.5 mb-5 border
                           border-[#333333] rounded-[3px] resize-none"
                value={phoneId}
                onChange={(event) => setPhoneId(event.target.value)} />
    );
  }

  let element = (
    <div className="flex flex-row h-[400px]">
      <div className="flex-grow bg-white shadow-lg p-4 overflow-y-auto">
        <div className="flex flex-row space-x-4 items-center">
          <div className="text-2xl font-bold text-gray-800">
            Phone Emulator
          </div>
        </div>
        <br/>
        <div className="flex flex-row space-x-4 items-center">
          Virtual Phone Number
        </div>
        <div>{phoneIdField}</div>
        <div className="flex flex-row space-x-4 items-center">
          <div>{connectButton}</div>
        </div>
        <br/>
        <div className="flex flex-row space-x-4 items-center">
          {phoneIcon}{micButton}{phoneButton}
        </div>
        <br/>
      </div>
    </div>
  );

  return element;
}
