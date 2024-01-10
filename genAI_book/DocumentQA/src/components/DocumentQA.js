import { useState, useRef, useEffect } from "react";
import { auth } from "lib/firebase";

export default function DocumentQA() {

  const initalMessage = "質問をどうぞ";
  const chatDataInit = [
    { "user": "bot", "text": initalMessage }
  ];

  const messageEnd = useRef(null);
  const inputRef = useRef(null);
  const [chatData, setChatData] = useState(chatDataInit);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [inputText, setInputText] = useState("");

  // Automatically scrolling up to show the last message.
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  useEffect(() => {
    const scrollUp = async () => {
      await sleep(500);
      messageEnd.current?.scrollIntoView();
    };
    scrollUp();
  });


  const getAnswer = async () => {
    const callBackend = async (question) => {
      const apiEndpoint = "/api/question";
      const token = await auth.currentUser.getIdToken();
      const uid = auth.currentUser.uid;
      const request = {  
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token,
          uid: uid,
          question: question,
        })
      };
      const res = await fetch(apiEndpoint, request);
      const data = await res.json();
      return data;
    };

    setButtonDisabled(true);

    const question = inputText.replace(/\r?\n/g, '');

    let chatDataNew = chatData.concat(); // clone an array
    chatDataNew.push({"user": "human", "text": inputText});
    chatDataNew.push({"user": "bot", "text": "_typing_"});
    setChatData(chatDataNew);

    const data = await callBackend(question);
    chatDataNew.pop();
    chatDataNew.push({"user": "bot", "text": data.answer});

    if (data.source.length > 0) {
      let infoSource = "[情報源]";
      for (const item of data.source) {
        infoSource += "\n" + item.filename + " (p." + item.page + ")"
      }
      chatDataNew.push({"user": "info", "text": infoSource});
    }
    setChatData(chatDataNew);
    setInputText("");

    setButtonDisabled(false);
  };


  const textStyle = {
    width: "400px", padding: "10px", marginBottom: "20px",
    border: "1px solid #333333", borderRadius: "10px",
  };
  const infoStyle = {
    width: "400px", padding: "10px", marginBottom: "20px",
    backgroundColor: "#f0f0f0", whiteSpace: "pre-wrap",
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

    if (item.user === "info") {
      const elem = (
        <div key={i} style={infoStyle}>
          {item.text}
        </div>
      );
      chatBody.push(elem);
    }

    if (item.user === "human") {
      const elem = (
          <div key={i} align="right">
            <div style={textStyle}>
              {item.text}
            </div>
          </div>
      );
      chatBody.push(elem);
    }
  }

  let inputElement;
  if (buttonDisabled === false) {
    inputElement = (
      <>
      <div align="right">
        <textarea style={{resize: "none", width: "400px", height: "100px"}}
	          value={inputText}
                  onChange={(event) => setInputText(event.target.value)} />
      </div>            
      <div align="right">
        <button disabled={buttonDisabled}
	        onClick={getAnswer}>Submit</button>
      </div>
      </>
    );
  } else {
    inputElement = (
	    <></>
    );
  }

  const element = (
    <>
      {chatBody}
      {inputElement}
      <div ref={messageEnd} />
    </>
  );

  return element;
}
