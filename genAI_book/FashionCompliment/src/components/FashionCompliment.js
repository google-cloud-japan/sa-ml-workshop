import { useState, useRef, useEffect } from "react";
import { auth } from "lib/firebase";

export default function FashionCompliment() {

  // Auxiliary classes and functions to handle image data
  class FileReaderEx extends FileReader {
    #readAs(blob, ctx) {
      return new Promise((resolve, reject) => {
        super.addEventListener("load", ({target}) => resolve(target.result));
        super.addEventListener("error", ({target}) => reject(target.error));
        super[ctx](blob);
      });
    }
    readAsDataURL(blob) {
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


  const blobToBase64 = async (imageBlob) => {
    const imageDataURL = await new FileReaderEx().readAsDataURL(imageBlob);
    const imageBase64 = imageDataURL.replace("data:", "").replace(/^.+,/, "");
    return imageBase64;
  }


  // Application main
  const initalMessage = "今日のあなたのファッションは？";
  const fileUploadMessage = "ファイルアップロード";
  const chatDataInit = [
    { "user": "bot", "text": initalMessage }
  ];
  const messageEnd = useRef(null);
  const inputRef = useRef(null);
  const [chatData, setChatData] = useState(chatDataInit);
  const [buttonDisabled, setButtonDisabled] = useState(false);

  // Automatically scrolling up to show the last message.
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  useEffect(() => {
    const scrollUp = async () => {
      await sleep(500);
      messageEnd.current?.scrollIntoView();
    };
    scrollUp();
  });


  const getMessage = async (imageBlob) => {
    const callBackend = async (imageBase64) => {
      const apiEndpoint = "/api/compliment";
      const token = await auth.currentUser.getIdToken();
      const request = {  
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token,
          image: imageBase64,
        })
      };
      const res = await fetch(apiEndpoint, request);
      const data = await res.json();
      return data;
    };

    const imageBase64 = await blobToBase64(imageBlob);
    const data = await callBackend(imageBase64);
    return data;
  }


  const onFileInputChange = async (evt) => {
    setButtonDisabled(true);

    const imageBlob = await resizeImage(evt.target.files[0], 500);

    let chatDataNew = chatData.concat(); // clone an array
    chatDataNew.push({"user": "image", "image": imageBlob});
    chatDataNew.push({"user": "bot", "text": "_typing_"});
    setChatData(chatDataNew);

    const data = await getMessage(imageBlob);

    chatDataNew.pop();
    chatDataNew.push({"user": "bot", "text": data.message});
    setChatData(chatDataNew);

    setButtonDisabled(false);
  };


  const textStyle = {
    width: "300px", padding: "10px", marginBottom: "20px",
    border: "1px solid #333333", borderRadius: "10px",
  };
  const loadingStyle = { width: "100px", marginLeft: "120px" };
  const chatBody = [];
  let i = 0;
  for (const item of chatData) {
    i += 1;

    if (item.user === "bot") {
      let elem;
      if (item.text === "_typing_") {
        elem = (
          <div key={i}>
            <img src="/loading.gif" alt="loading" style={loadingStyle} />
          </div>
        );
      } else {
        elem = (
          <div key={i} style={textStyle}>
            {item.text}
          </div>
        );
      };
      chatBody.push(elem);
    }

    if (item.user === "image") {
      const imageObjectURL = URL.createObjectURL(item.image);
      const elem = (
        <div key={i} align="right">
          <img src={imageObjectURL} width="200" alt="user provided" />
        </div>
      );
      chatBody.push(elem);
    }
  }

  if (buttonDisabled === false) {
    const elem = (
      <div key="fileUpload" align="right">
        <button onClick={() => inputRef.current.click()}>
          {fileUploadMessage}
        </button>
        <input ref={inputRef} hidden
          type="file" accept="image/*" onChange={onFileInputChange} />
      </div>            
    );
    chatBody.push(elem);
  }

  const element = (
    <div style = {{ margin: "10px", width: "600px" }}>
      {chatBody}
      <div ref={messageEnd} />
    </div>
  );

  return element;
}
