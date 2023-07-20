import React, { useState } from 'react';
import "./App.css";

const projectId = "[Project ID]";

export const App = (props) => {

  const initialText = "I go to school yesterday. I eat apple for lunch. I like to eat apple.";
  const [text, setText] = useState(initialText);
  const [corrected, setCorrected] = useState("");
  const [samples, setSamples] = useState("");
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const getAnswer = async () => {
    const callBackend = async () => {
      const inputText = text.replace(/\r?\n/g, '');
      const baseURL = "https://" + projectId + ".web.app";
      const apiEndpoint = baseURL + "/grammar-service/api/v1/correction";
      const request = {  
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputText,
        })
      };
      const res = await fetch(apiEndpoint, request);
      const data = await res.json();
      return data;
    };

    setButtonDisabled(true);
    setCorrected("");
    setSamples("");

    const data = await callBackend();

    setCorrected(data.corrected);
    setSamples(data.samples);
    setButtonDisabled(false);
  }

  const element = (
        <div className="App">
          <textarea value={text} onChange={(event) => setText(event.target.value)} />
          <br/>
          <button disabled={buttonDisabled} onClick={getAnswer}>Correct me!</button>
          <h2>Grammar correction</h2>
          <div className="text">{corrected}</div>
          <h2>Model sentences</h2>
          <div className="text">{samples}</div>
        </div>
  );

  return element;
}
