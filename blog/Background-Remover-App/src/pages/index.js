import Head from 'next/head';
import { useState, useEffect } from 'react';
import BgRemoverUI from 'components/BgRemoverUI';

export default function BgRemoverPage() {
  // Trick to avoid serverside rendering issue
  const [init, setInit] = useState(null);
  useEffect(() => {setInit(true);}, []);

  let element;
  if (init) {
    element = (
      <><BgRemoverUI /></>
    );
  } else {
    element = (<></>);
  }
  return (
    <>
      <Head>
        <title>Background Remover Application</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <h2>Background Remover Application</h2>
      {element}
    </>
  );
}
