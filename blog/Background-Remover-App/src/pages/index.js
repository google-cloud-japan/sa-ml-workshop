import Head from "next/head";
import { useState, useEffect } from "react";
import RmbgUI from "components/RmbgUI";

export default function RmbgPage() {
  // Trick to avoid serverside rendering issue.
  const [init, setInit] = useState(null);
  useEffect(() => {setInit(true);}, []);

  let element;
  if (init) {
    element = (
      <><RmbgUI /></>
    );
  } else {
    element = (<></>);
  }
  return (
    <>
      <Head>
        <title>Background Eraser Application</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <h2>Background Eraser Application</h2>
      {element}
    </>
  );
}
