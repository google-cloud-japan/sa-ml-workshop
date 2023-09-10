import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import loading from "./images/loading.gif";

const projectId = "[Project ID]";
const lang = "en";


class FileReaderEx extends FileReader {
  #readAs(blob, ctx) {
    return new Promise((resolve, reject) => {
      super.addEventListener("load", ({target}) => resolve(target.result));
      super.addEventListener("error", ({target}) => reject(target.error));
      super[ctx](blob);
    });
  }

  readAsDataURL(blob){
    return this.#readAs(blob, "readAsDataURL");
  }
}


class ImageEx extends Image {
  create(blob) {
    return new Promise((resolve, reject) => {
      super.addEventListener("load", () => resolve(this));
      super.addEventListener("error", reject);
      super.src = URL.createObjectURL(blob);
    });
  }
}


const resizeImage = async (imageBlob, width) => {
  const context = document.createElement("canvas").getContext("2d");
  const image = await new ImageEx().create(imageBlob);

  const heightCurrent = image.naturalHeight;
  const widthCurrent = image.naturalWidth;
  const height = heightCurrent * (width / widthCurrent);
  context.canvas.width = width;
  context.canvas.height = height;
  context.drawImage(image, 0, 0, widthCurrent, heightCurrent, 0, 0, width, height);

  return new Promise((resolve) => {
    context.canvas.toBlob(resolve, "image/jpeg", 0.9);
  });
}


export const App = (props) => {

  const initalMessage = {
    "en": "What's your fashion today?",
    "ja": "今日のあなたのファッションは？",
  };

  const fileUploadMessage = {
    "en": "Upload File",
    "ja": "ファイルアップロード",
  };

  const chatDataInit = [{
    "user": "bot", "text": initalMessage[lang]
  }];

  const messageEnd = useRef(null);
  const inputRef = useRef(null);
  const [chatData, setChatData] = useState(chatDataInit);
  const [buttonDisabled, setButtonDisabled] = useState(false);


  const getAnswer = async (imageBlob) => {
    const callBackend = async (imageBase64) => {
      const baseURL = "https://" + projectId + ".web.app";
      const apiEndpoint = baseURL + "/fashion-compliment-service/api/v1/get-compliment";
      const request = {  
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "image": imageBase64,
          "lang": lang,
        })
      };
      const res = await fetch(apiEndpoint, request);
      const data = await res.json();
      return data;
    };

    const imageDataURL = await new FileReaderEx().readAsDataURL(imageBlob);
    const imageBase64 = imageDataURL.replace("data:", "").replace(/^.+,/, "");
    const data = await callBackend(imageBase64);
    return data;
  }


  const onFileInputChange = async (evt) => {
    setButtonDisabled(true);

    const imageBlob = await resizeImage(evt.target.files[0], 500);

    let chatDataNew = chatData.concat();
    chatDataNew.push({"user": "image", "image": imageBlob});
    chatDataNew.push({"user": "bot", "text": "_typing_"});
    setChatData(chatDataNew);

    const data = await getAnswer(imageBlob);

    chatDataNew.pop();
    chatDataNew.push({"user": "bot", "text": data.message});
    setChatData(chatDataNew);

    setButtonDisabled(false);
  };


  const chatBody = [];
  let i = 0;
  for (const item of chatData) {
    i += 1;

    if (item.user === "bot") {
      let elem;
      if (item.text === "_typing_") {
        elem = (
          <div key={i} className="typing">
            <img src={loading} alt="loading" style={{
              width: "100px", marginLeft: "120px"}} />
          </div>
        );          
      } else {
        elem = (
          <div key={i} className="bot" style={{
            width: "300px", padding: "10px",
            marginBottom: "20px", border: "1px solid #333333",
            borderRadius: "10px"}}>
            {item.text}
          </div>
        );
      };
      chatBody.push(elem);
    }

    if (item.user === "image") {
      const imageObjectURL = URL.createObjectURL(item.image);
      const elem = (
        <div key={i} className="image" align="right">
          <img src={imageObjectURL} width="200" alt="user provided" />
        </div>
      );
      chatBody.push(elem);
    }
  }

  if (buttonDisabled === false) {
    const elem = (
      <div key="fileUpload" className="fileUpload" align="right">
        <button onClick={() => inputRef.current.click()}>
          {fileUploadMessage[lang]}
        </button>
        <input ref={inputRef} hidden
          type="file" accept="image/*" onChange={onFileInputChange} />
      </div>            
    );
    chatBody.push(elem);
  }

  const element = (
        <>
        <div className="App">
          {chatBody}
        </div>
        <div ref={messageEnd} />
        </>
  );

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    const scrollUp = async () => {
      messageEnd.current?.scrollIntoView();
      await sleep(500);
      messageEnd.current?.scrollIntoView();
    };
    scrollUp();
  });

  return element;
}
