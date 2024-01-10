import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { auth, signInWithGoogle } from "lib/firebase";
import { signOut } from "firebase/auth";
import DocumentQA from "components/DocumentQA";

export default function DocumentQAPage() {
  const [loginUser, setLoginUser] = useState(null);

  // Register login state change handler
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setLoginUser(user);
    });
    return unsubscribe;
  }, []);

  let element;

  if (loginUser) {
    element = (
      <>
        <DocumentQA />
        <br/>
        <button onClick={() => signOut(auth)}>Logout</button>
        <br/><Link href="/">Back to Smart Drive</Link>
      </>
    );
  } else {
    element = (
      <>
        <button onClick={signInWithGoogle}>
          Sign in with Google
        </button>
      </>
    );
  }


  return (
    <>
      <Head>
        <title>Document QA Service</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div style={{ margin: "10px", width: "600px" }}>
        {element}
      </div>
    </>
  );
}
