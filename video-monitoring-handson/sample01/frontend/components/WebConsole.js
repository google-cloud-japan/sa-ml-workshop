import { useState, useRef, useEffect } from "react";
import { MonitoringBackendAPI } from "lib/monitoring-backend";
import { LiveVideoManager } from "lib/live-video-manager";
import { markdownComponents } from "lib/constants";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function WebConsole() {

  // setup variables
  const sleep = (time) => new Promise((r) => setTimeout(r, time));
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const monitoringTextInit = "## Monitoring Message"
  const [monitoringText, setMonitoringText] = useState(monitoringTextInit);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [buttonDisabled, setButtonDisabled] = useState(false);


  // setup monitoring backend API library.
  const _monitoringApi = useRef(
    new MonitoringBackendAPI(BACKEND_URL)
  );
  const monitoringApi = _monitoringApi.current;


  // setup video input library.
  const _liveVideoManager = useRef();
  const liveVideoManager = _liveVideoManager.current;

  useEffect(() => {
    const videoElement = document.getElementById("video");
    const canvasElement = document.getElementById("canvas");
    _liveVideoManager.current = new LiveVideoManager(videoElement, canvasElement);
  }, []); 


  // start and stop video input.
  useEffect(() => {
    if (connectionStatus == "connected") {
        startVideoInput();  // Show video image on screen.
        startVideoStream(); // Send image frames to backend.
    } else {
        stopVideoStream();
        stopVideoInput();
    }
  }, [connectionStatus]);

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
    }
  };

  const stopVideoStream = () => {
    if (!liveVideoManager) return;
    liveVideoManager.onNewFrame = () => {};
  };


  // connect and disconnect to monitoring backend.
  const connect = async () => {
    setButtonDisabled(true);
    monitoringApi.connect();
    while (!monitoringApi.isConnected()) {
      await sleep(500);
      if (monitoringApi.isClosed()) {
        disconnect();
        return;
      }
    }
    setButtonDisabled(false);
    setConnectionStatus("connected");
  };

  const disconnect = async () => {
    setButtonDisabled(true);
    await monitoringApi.disconnect();
    await sleep(500);
    setButtonDisabled(false);
    setConnectionStatus("disconnected");
  };


  // receive a message from monitoring backend.
  monitoringApi.onReceiveResponse = (messageResponse) => {
    console.log('message from monitoring backend', messageResponse);
    let status_text = "OK"
    if (messageResponse.status != "usual") {
      status_text = "Alert";
    }
    setMonitoringText(`
### Status: ${status_text}
### ${messageResponse.summary}
${messageResponse.details}
    `);
  }

  
  // UI components
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
              onClick={disconnect}>Disconnect</button>
    );
  } else {
    connectButton = (
      <button className="bg-green-500 hover:bg-green-600
                         text-white font-bold py-2 px-4 rounded"
              onClick={connect}>Connect</button>
    );
  }

  const monitoringMessage = (
    <div className="w-[400px] p-2.5 mb-5 border border-[#333333] rounded-[10px]">
       <ReactMarkdown remarkPlugins={[remarkGfm]}
                      components={markdownComponents}>
         {monitoringText}
       </ReactMarkdown>
    </div>
  );

  const element = (
    <div className="flex-shrink-0 bg-white p-4">
      <div className="flex flex-row space-x-4 items-center">
        <div className="text-2xl font-bold text-gray-800">
          Live Video Monitoring Console
        </div>
        {connectButton}
      </div>
      <br/>
      <div className="flex flex-row space-x-4 items-center">
        <div className="flex flex-row space-x-4 items-center">
          <div>
            {/* realtime video image */}
            <video id="video" width="320" className="bg-black"
                   autoPlay playsInline muted></video>
            {/* hidden canvas to copy a frame */}
            <canvas id="canvas" hidden></canvas>
          </div>
          {monitoringMessage}
        </div>
      </div>
    </div>
  );
  return element;
}
