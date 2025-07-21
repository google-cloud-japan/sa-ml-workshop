import { useState, useRef, useEffect } from "react";
import { markdownComponents } from "lib/constants";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function TextChat(props) {

  const newAutocallMessage = props.newAutocallMessage;
  const setNewAutocallMessage = props.setNewAutocallMessage;
  const sendMessage = props.sendMessage;
  const autocallRunning = props.autocallRunning;

  const inputRef = useRef(null);
  const [inputText, setInputText] = useState("Describe the situation.");
  const [chatData, setChatData] = useState(
	  {message: "", summary: "", text: "", timestamp: null}
  );

  useEffect(() => {
    if (newAutocallMessage) {
      handleNewMessage();
    }
  }, [newAutocallMessage]);

  useEffect(() => {
    if (props.connectionStatus == "connected") {
      setChatData({message: "", summary: "", text: "", timestamp: null});
    }
  }, [props.connectionStatus]);

  const sendRequest = async () => {
    await sendMessage(inputText);
  };

  const handleNewMessage = () => {
    if (newAutocallMessage == "") return;
    let chatDataNew = structuredClone(chatData);
    if (newAutocallMessage == "__clear__") {
      chatDataNew = {message: "", summary: "", text: "", timestamp: null}
    } else if (newAutocallMessage.startsWith("__summary__")) {
      chatDataNew.summary = newAutocallMessage.substring(11);
    } else {
      chatDataNew.message += "\n" + newAutocallMessage;
    }
    if (chatDataNew.summary == "") {
      chatDataNew.text = `
### Message from autocall agent
${chatDataNew.message}
`
    } else {
      chatDataNew.text = `
### Message from autocall agent
${chatDataNew.message}

### Conversation result
${chatDataNew.summary}
`
    }
    chatDataNew.timestamp = Date.now();
    setChatData(chatDataNew);
    setNewAutocallMessage("");
  };

  const textStyle = "w-[640px] p-2.5 mb-5 border border-[#333333] rounded-[10px]";

  let chatBody;
  if (chatData.text == "") {
    chatBody = (<></>);
  } else {
    chatBody = (
      <div className={textStyle}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}
                         components={markdownComponents}>
            {chatData.text}
          </ReactMarkdown>
      </div>
    );
  }

  const textareaStyle = `w-[50%] h-[80px] py-2 px-4 border border-blue-300 rounded-md
                         focus:border-blue-500 outline-none shadow-sm resize-none`;

  let sendButton;
  if (autocallRunning) {
    sendButton = (<></>);
  } else {
    sendButton = (
      <button className="bg-green-500 hover:bg-green-600
                         text-white font-bold py-2 px-4 rounded"
              onClick={sendRequest}>Send Request</button>
    );
  } 

  const inputElement = (
    <>
      <div align="right">
        <textarea className={textareaStyle}
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)} />
      </div>            
      <div align="right">
        {sendButton}
      </div>
    </>
  );

  const element = (
    <>
      {inputElement}
      <br/>
      {chatBody}
    </>
  );

  return element;
}
