import { useState } from "react";
import { auth } from "lib/firebase";

export default function GrammarCorrection() {

  const initialText = "I go to school yesterday. I eat apple lunch. I like eat apple.";
  const [text, setText] = useState(initialText);
  const [answer, setAnswer] = useState({corrected: " ", samples: "-\n-\n-"});
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const getAnswer = async () => {
    const callBackend = async () => {
      // Join multiple lines into a single line.
      const inputText = text.replace(/\r?\n/g, " ");
      const apiEndpoint = "/api/correction";

      const token = await auth.currentUser.getIdToken();
      const request = {  
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token,
          text: inputText,
        })
      };

      const response = await fetch(apiEndpoint, request);
      const data = await response.json();
      return data;
    };

    setButtonDisabled(true);
    const data = await callBackend();
    setAnswer({corrected: data.corrected, samples: data.samples});
    setButtonDisabled(false);
  }

  const textAreaStyle = {
    fontSize: "1.05rem", width: "640px", height: "200px"
  };
  const answerStyle = {
    fontSize: "1.05rem", whiteSpace: "pre-wrap"
  };
  const element = (
    <>
      <textarea
        style={textAreaStyle}
        value={text}
        onChange={(event) => setText(event.target.value)} />
      <br/>
      <button
        disabled={buttonDisabled}
        onClick={getAnswer}>Correct me!</button>
      <h2>Grammar correction</h2>
      <div style={answerStyle}>{answer.corrected}</div>
      <h2>Model sentences</h2>
      <div style={answerStyle}>{answer.samples}</div>
    </>
  );

  return element;
}
