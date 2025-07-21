import { useState, useRef, useEffect } from "react";
import { VoicecallBackendAPI } from "lib/voicecall-backend";
import {
  LiveAudioInputManager,
  LiveAudioOutputManager
} from "lib/live-audio-manager";

export default function VoiceClient() {

  // setup variables.
  const sleep = (time) => new Promise((r) => setTimeout(r, time));
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [micStatus, setMicStatus] = useState("off");
  const [buttonDisabled, setButtonDisabled] = useState(false);


  // setup voicecall backend API library.
  const _voicecallApi = useRef(
    new VoicecallBackendAPI(BACKEND_URL)
  );
  const voicecallApi = _voicecallApi.current;


  // setup audio input / output library.
  const _liveAudioOutputManager = useRef();
  const _liveAudioInputManager = useRef();
  const liveAudioOutputManager = _liveAudioOutputManager.current;
  const liveAudioInputManager = _liveAudioInputManager.current;

  useEffect(() => {
    _liveAudioInputManager.current = new LiveAudioInputManager();
    _liveAudioOutputManager.current = new LiveAudioOutputManager();
  }, []); 


  // start and stop audio input / output
  useEffect(() => {
    if (connectionStatus == "connected") {
      startAudioInput();
    } else {
      stopAudioStream();
      stopAudioInput();
    }
  }, [connectionStatus]);

  useEffect(() => {
    if (micStatus == "on") {
      startAudioStream();
    } else {
      const _stopAudioStream = async () => {
        await sleep(2000); // wait for finishing sending audio data.
        stopAudioStream();
      };
      _stopAudioStream();
    }
  }, [micStatus]);

  const startAudioInput = async () => {
    if (!liveAudioInputManager) return;
    await liveAudioInputManager.connectMicrophone();
  };

  const stopAudioInput = async () => {
    if (!liveAudioInputManager) return;
    await liveAudioInputManager.disconnectMicrophone();
  };

  const startAudioStream = () => {
    if (!voicecallApi.isConnected) return;
    liveAudioInputManager.onNewAudioRecordingChunk = (audioData) => {
      console.log("send audio data");
      voicecallApi.sendAudioMessage(audioData);
    };
  }

  const stopAudioStream = () => {
    if (!liveAudioInputManager) return;
    liveAudioInputManager.onNewAudioRecordingChunk = () => {};
  }


  // connect and disconnect to voicecall backend
  const connect = async () => {
    setButtonDisabled(true);
    voicecallApi.connect();
    while (!voicecallApi.isConnected()) {
      await sleep(500);
      if (voicecallApi.isClosed()) {
        disconnect();
        return;
      }
    }
    setButtonDisabled(false);
    setConnectionStatus("connected");
  };


  const disconnect = async () => {
    setButtonDisabled(true);
    await voicecallApi.disconnect();
    await sleep(500);
    setButtonDisabled(false);
    setConnectionStatus("disconnected");
  };


  // receive audio message from voicecall backend.
  voicecallApi.onReceiveResponse = (messageResponse) => {
    if (messageResponse.type == "audio") {
      console.log("auido data received.")
      const audioChunk = messageResponse.data;
      liveAudioOutputManager.playAudioChunk(audioChunk);
    }
  };


  // UI components
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
              onClick={disconnect}>Disconnect Backend</button>
    );
  } else {
    connectButton = (
      <button className="bg-green-500 hover:bg-green-600
                         text-white font-bold py-2 px-4 rounded"
              onClick={connect}>Connect Backend</button>
    );
  }

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
  if (connectionStatus != "connected") {
    micButton = (<></>);
  }

  const element = (
    <div className="flex-shrink-0 bg-white p-4">
      <div className="flex flex-col space-x-4 items-left">
        <div className="text-2xl font-bold text-gray-800">
          Voice Client
        </div>
        <br/>
        <div className="flex flex-row space-x-4 items-left">
          {connectButton}{micButton}
        </div>
      </div>
    </div>
  );
  return element;
}
