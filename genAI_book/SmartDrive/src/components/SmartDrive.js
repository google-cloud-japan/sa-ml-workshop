import { useState, useEffect, useRef } from "react";
import { auth } from "lib/firebase";
import { getStorage, ref, listAll, getBlob, 
         uploadBytes, deleteObject } from "firebase/storage";

export default function SmartDrive() {

  const [fileList, setFileList] = useState([]);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [popupText, setPopupText] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const inputRef = useRef(null);

  // Reload filelist to refrect the information button evary 1 minute.
  useEffect(() => {
    reloadFileList();
    const interval = setInterval(() => { getFileList(); }, 60000);
    return () => clearInterval(interval);
  }, []);


  const reloadFileList = async () => {
    setFileList([{filename: "Loading...", summary: false}]);
    await getFileList();
  };

  const getFileList = async () => {
    const storage = getStorage();
    const uid = auth.currentUser.uid;
    let listRef = ref(storage, uid + "/summary");
    let res = await listAll(listRef);
    const summaryList = [];
    for (let item of res.items) {
      summaryList.push(item.name.replace(/(.txt$)/, ".pdf"));
    }

    listRef = ref(storage, uid);
    res = await listAll(listRef);
    const newFileList = [];
    for (let item of res.items) {
      let summary = false;
      if (summaryList.includes(item.name)) {
        summary = true;        
      }
      newFileList.push({filename: item.name, summary: summary});
    }
    setFileList(newFileList);
  };

  const deleteFiles = async () => {
    setButtonDisabled(true);
    setFileList([{filename: "Removing...", summary: false}]);
    const storage = getStorage();
    const uid = auth.currentUser.uid;

    const results = [];
    let listRef = ref(storage, uid + "/summary");
    let res = await listAll(listRef);
    for (let item of res.items) {
      results.push(deleteObject(item));
    }
    listRef = ref(storage, uid);
    res = await listAll(listRef);
    for (let item of res.items) {
      results.push(deleteObject(item));
    }
    await Promise.all(results);
    await getFileList();
    setButtonDisabled(false);
  };

  const showSummary = async (filename) => {
    setPopupText("Loading...");
    setShowPopup(true);
    const storage = getStorage();
    const uid = auth.currentUser.uid;
    const filepath = uid + "/summary/" + filename.replace(/(.pdf$)/, ".txt");
    const summaryBlob = await getBlob(ref(storage, filepath));
    let summaryText = await summaryBlob.text();
    if (summaryText.length > 650) {
      summaryText = summaryText.substring(0, 650) + "..."
    }
    setPopupText(summaryText);
  };

  // Handling file upload
  const onFileInputChange = async (evt) => {
    setButtonDisabled(true);
    const pdfBlob = evt.target.files[0];
    const storage = getStorage();
    const uid = auth.currentUser.uid
    const storageRef = ref(storage, uid + "/" + pdfBlob.name);
    await uploadBytes(storageRef, pdfBlob)
    await getFileList();
    setButtonDisabled(false);
  };

  // Information button element to show the summary of PDF
  const infoButton = (item) => {
    var buttonElement;
    if (item.summary) {
      buttonElement = (
        <span className="circle" style={{cursor: "pointer"}}
	      onClick={() => showSummary(item.filename)}>i</span>
      );
    } else {    
      buttonElement = (
        <span className="circle" style={{backgroundColor: "#fff"}}> </span>
      );
    }
    return buttonElement;
  };

  // Filelist element
  const fileListElement = [];
  for (let item of fileList) {
    const fileElement = (
      <div key={item.filename}
           style={{ height: "1.8rem", lineHeight: "1.8rem" }}>
	{infoButton(item)} {item.filename}
      </div>
    );
    fileListElement.push(fileElement);
  }

  // Popup element showing the summary of PDF
  const popupElement = (
    <div style={{ position: "absolute", left: "100px", top: "50px",
                  width: "400px", height: "320px",
                  padding: "10px", margin: "10px",
                  border: "1px solid", borderRadius: "10px",
		  backgroundColor: "#f0f0f0" }}>
      {popupText}
      <div style={{ position: "absolute", bottom: "10px", right: "10px" }}>
        <button onClick={() => setShowPopup(false)}>Close</button>
      </div>
    </div>
  );

  // Button element for upload / delete / reload
  var buttonElement;
  if (buttonDisabled === false) {
    buttonElement = (
      <>
        <button onClick={() => inputRef.current.click()}>Upload PDF</button>
        <input ref={inputRef} hidden type="file" accept="application/pdf"
	       onChange={onFileInputChange} />
        <button onClick={deleteFiles}>Delete All</button>
        <button onClick={reloadFileList}>Reload</button>
      </>            
    );
  } else {
    buttonElement = (
      <img src="/loading.gif" alt="loading"
           style={{ width: "50px", marginLeft: "40px" }} />
    );
  }


  const element = (
    <>
      <div style={{ width: "600px", height: "400px",
                    overflow: "scroll", overflowX: "hidden",
                    padding: "10px", border: "1px solid" }}>
        {fileListElement}
        {showPopup && popupElement}
      </div>
      {buttonElement}
    </>
  );

  return element;
}
