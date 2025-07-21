import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import TextChat from "components/TextChat";
import DropdownMenu from "components/DropdownMenu";
import { MonitoringBackendAPI } from "lib/monitoring-backend";
import { AutocallBackendAPI } from "lib/autocall-backend";
import { LiveVideoManager } from "lib/live-video-manager";
import { markdownComponents } from "lib/constants";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


export default function WebConsole() {

  const MONITORING_BACKEND_URL = process.env.NEXT_PUBLIC_MONITORING_BACKEND_URL;
  const AUTOCALL_BACKEND_URL = process.env.NEXT_PUBLIC_AUTOCALL_BACKEND_URL;

  const monitoringTextInit = "## Monitoring Message"
  const [monitoringText, setMonitoringText] = useState(monitoringTextInit);
  const [newAutocallMessage, setNewAutocallMessage] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [customerName, setCustomerName] = useState("James Smith");
  const [customerId, setCostomerId] = useState("JS3039");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [videoInput, setVideoInput] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [autocallRunning, setAutocallRunning] = useState(false);
  const [reconnectTimerId, setReconnectTimerId] = useState(null);
  const [outputLanguage, setOutputLanguage] = useState("English");
  const outputLanguageRef = useRef();

  const _liveVideoManager = useRef();
  const liveVideoManager = _liveVideoManager.current;

  const sleep = (time) => new Promise((r) => setTimeout(r, time));

  const langCodeMap = {
    "English": "en-US",
    "Japanese": "ja-JP",
    "Korean": "ko-KR",
  };

  let reconnectDelay = 1000;
  const MAX_RECONNECT_DELAY = 30000;

  useEffect(() => {
    const videoElement = document.getElementById("video");
    const canvasElement = document.getElementById("canvas");
    _liveVideoManager.current = new LiveVideoManager(videoElement, canvasElement);
  }, []); 

  useEffect(() => {
    if (videoInput) {
        startVideoInput(); // Show video image on screen.
      if (connectionStatus == "connected") {
          startVideoStream(); // Send image frames to backend.
      }
    } else {
        setMonitoring(false);
        stopVideoStream();
        stopVideoInput();
    }
  }, [videoInput]);

  useEffect(() => {
    if (connectionStatus !== "connected") return;
    if (monitoring) {
      monitoringSendTextMessage("monitoring on")
    } else {
      monitoringSendTextMessage("monitoring off")
    }
  }, [monitoring]);

  useEffect(() => {
    outputLanguageRef.current = outputLanguage;
    if (connectionStatus !== "connected") return;
    monitoringSendTextMessage("language:" + outputLanguage)
  }, [outputLanguage]);

  const _monitoringApi = useRef(
    new MonitoringBackendAPI(MONITORING_BACKEND_URL)
  );
  const monitoringApi = _monitoringApi.current;

  const _autocallApi = useRef(
    new AutocallBackendAPI(AUTOCALL_BACKEND_URL + "/frontend")
  );
  const autocallApi = _autocallApi.current;

  const startVideoInput = async () => {
    if (!liveVideoManager) return;
    await liveVideoManager.startWebcam();
  };

  const stopVideoInput = async () => {
    if (!liveVideoManager) return;
    await liveVideoManager.stopWebcam();
  };

  const startVideoStream = () => {
    if (!monitoringApi.isConnected()) return;
    liveVideoManager.onNewFrame = (b64Image) => {
      console.log("send a video frame to monitoring backend");
      monitoringApi.sendImageMessage(b64Image);

      if (autocallApi.isConnected()) {
        console.log("send a video frame to autocall backend");
        autocallApi.sendImageMessage(b64Image);
      }
    }
  };

  const stopVideoStream = () => {
    if (!liveVideoManager) return;
    liveVideoManager.onNewFrame = () => {};
  };

  const manualConnect = async () => {
    monitoringApi.onConnectionClosed = () => {}; // Don't reconnect for the first try.
    clearTimeout(reconnectTimerId);
    connect();
  }

  const manualDisconnect = async () => {
    monitoringApi.onConnectionClosed = () => {}; // Disable reconnect handler.
    clearTimeout(reconnectTimerId);
    disconnect();
    autocallDisconnect();
  }

  const connect = async () => {
    setButtonDisabled(true);
    clearTimeout(reconnectTimerId);

    monitoringApi.connect();

    while (!monitoringApi.isConnected()) {
      await sleep(500);
      if (monitoringApi.isClosed()) {
        disconnect();
        return;
      }
    }

    // Set reconnect handler.
    console.log("Setting monitoring reconnect handler.");
    reconnectDelay = 1000;
    monitoringApi.onConnectionClosed = () => {
      setConnectionStatus("disconnected");
      setButtonDisabled(true);
      setVideoInput(false);

      console.log(`Attempting to reconnect in ${reconnectDelay / 1000}s...`);
      const _reconnectTimerId = setTimeout(() => {
        console.log("Reconnecting...");
        connect();
      }, reconnectDelay);
      setReconnectTimerId(_reconnectTimerId);

      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    };


    setVideoInput(true);
    setMonitoring(true);
    monitoringSendTextMessage("language:" + outputLanguageRef.current)
    setButtonDisabled(false);
    setConnectionStatus("connected");
  };

  const disconnect = async () => {
    setButtonDisabled(true);
    setVideoInput(false);
    await sleep(200);
    await monitoringApi.disconnect();
    await sleep(800);
    setButtonDisabled(false);
    setConnectionStatus("disconnected");
  };

  const autocallConnect = async() => {
    autocallApi.setPhoneId(phoneId);
    autocallApi.connect();
    while (!autocallApi.isConnected()) {
      await sleep(500);
      if (autocallApi.isClosed()) {
        autocallDisconnect();
        return;
      }
    }
    setAutocallRunning(true);
  };

  const autocallDisconnect = async() => {
    await autocallApi.disconnect();
    setAutocallRunning(false);
  };

  monitoringApi.onReceiveResponse = (messageResponse) => {
    console.log("message from monitoring backend", messageResponse);
    let status_text = "OK"
    if (messageResponse.status != "usual") {
      status_text = "Alert";
    }
    setMonitoringText(`
### Status: ${status_text}
### ${messageResponse.summary}
${messageResponse.details}
    `);
    if (messageResponse.status != "usual") {
      setMonitoring(false);
      autocallSendRequest(messageResponse.summary);
    }
  }

  autocallApi.onReceiveResponse = (messageResponse) => {
    console.log("message from autocall backend: ", messageResponse);
    const command = messageResponse.command;
    const phone_id = messageResponse.phone_id;
    const data = messageResponse.data;
    if (phone_id != phoneId) return;
    if (command == "message") {
      setNewAutocallMessage("- " + data);
      if (data == "Conversation finished.") {
        autocallDisconnect(); // disconnect autocall backend
      }
    }
    if (command == "summary") {
      setNewAutocallMessage("__summary__" + data);
    }
  }

  const autocallSendRequest = async (message) => {
    if (autocallRunning || !autocallApi.isClosed()) {
      console.log("autocall agent is already active.")
      return;
    }
    await autocallConnect();
    if (!autocallApi.isConnected()) {
      console.log("failed to connect autocall backend.");
      autocallDisconnect();
      return;
    }
    const requestText = `
[user request]
- customer name: ${customerName}
- customer ID: ${customerId}
- current situation: ${message}

Please speak in ${outputLanguage}
Start a conversation with the security operator now.
`
    const request = {
      type: "text",
      data: requestText,
      lang: langCodeMap[outputLanguage],
    };
    setNewAutocallMessage("__clear__");
    console.log("Sending request to autocall backend: ", request)
    autocallApi.sendMessage(request);
  };

  const monitoringSendTextMessage = (message) => {
    console.log("Sending text to backend API: ", message)
    monitoringApi.sendTextMessage(message);
  };

  let connectButton;
  if (buttonDisabled) {
    connectButton = (
      <button className="bg-gray-400
                         text-white font-bold py-2 px-4 rounded">
	    {(connectionStatus == "connected") ? "Disconnect" : "Connect"}</button>
    );
  } else if (connectionStatus == "connected") {
    connectButton = (
      <button className="bg-red-500 hover:bg-red-600
                         text-white font-bold py-2 px-4 rounded"
              onClick={manualDisconnect}>Disconnect</button>
    );
  } else {
    connectButton = (
      <button className="bg-green-500 hover:bg-green-600
                         text-white font-bold py-2 px-4 rounded"
              onClick={manualConnect}>Connect</button>
    );
  }

  let monitorButton;
  if (buttonDisabled) {
    monitorButton = (
      <button className="bg-gray-400
                         text-white font-bold py-2 px-4 rounded">
	    {(monitoring == false) ? "Start Monitoring" : "Stop Monitoring"}</button>
    );
  } else if (monitoring == false) {
    monitorButton = (
      <button className="bg-green-500 hover:bg-green-600
                         text-white font-bold py-2 px-4 rounded"
              onClick={() => setMonitoring(true)}>Start Monitoring</button>
    );
  } else {
    monitorButton = (
      <button className="bg-red-500 hover:bg-red-600
                         text-white font-bold py-2 px-4 rounded"
              onClick={() => setMonitoring(false)}>Stop Monitoring</button>
    );
  }

  if (connectionStatus != "connected" || videoInput == false) monitorButton = (<></>);

  const monitoringMessage = (
        <div className="w-[400px] p-2.5 mb-5 border border-[#333333] rounded-[10px]">
           <ReactMarkdown remarkPlugins={[remarkGfm]}
                          components={markdownComponents}>
             {monitoringText}
           </ReactMarkdown>
        </div>
  );

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

  const customerNameField = (
      <textarea className="w-42 h-12 p-2.5 mb-5 border
                           border-[#333333] rounded-[3px] resize-none"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)} />
  );

  const customerIdField = (
      <textarea className="w-42 h-12 p-2.5 mb-5 border
                         border-[#333333] rounded-[3px] resize-none"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)} />
  );

  let element = (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex-shrink-0 bg-white p-4">
        <div className="flex flex-row space-x-4 items-center">
          <div className="text-2xl font-bold text-gray-800">
            Live Video Monitoring Console
          </div>
          <div className="text-1xl text-black bg-gray-200 rounded px-2 py-1">
            <Link href="./voice_client" target="_blank" rel="noopener noreferrer">
              Open Phone Emulator
            </Link>
          </div>
        </div>
        <br/>
        <div className="flex flex-row space-x-4 items-center">
          <div className="flex flex-col space-x-4 items-left">
	    Secuirty Phone Number
            {phoneIdField}
          </div>
          <div className="flex flex-col space-x-4 items-left">
            Customer Name
            {customerNameField}
          </div>
          <div className="flex flex-col space-x-4 items-left">
            Customer ID
            {customerIdField}
          </div>
        </div>            
        <div className="flex flex-row space-x-4 items-center">
          <div>{connectButton}</div>
          <div><DropdownMenu options={[
                               { value: "English", label: "English" },
                               { value: "Japanese", label: "日本語" },
                               { value: "Korean", label: "한국어" },
                             ]}
                               placeholder={outputLanguage}
                               disabled={() => {false}}
                               onSelect={(option) => setOutputLanguage(option.value)} />
          </div>
          <div>{monitorButton}</div>
        </div>
        <br/>
        <div className="flex flex-row space-x-4 items-center">
            <div id="video-preview">
              <video id="video" width="320" className="bg-black"
                     autoPlay playsInline muted></video>
              <canvas id="canvas" hidden></canvas>
            </div>
          {monitoringMessage}
        </div>
      </div>
      <div className="flex-grow bg-gray-50 border-t p-6 overflow-y-auto">
        <TextChat sendMessage={autocallSendRequest}
                  newAutocallMessage={newAutocallMessage}
                  setNewAutocallMessage={setNewAutocallMessage}
                  autocallRunning={autocallRunning}
        />
      </div>
    </div>
  );

  return element;
}
