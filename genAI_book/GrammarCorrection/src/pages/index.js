import Head from "next/head";
import { useState, useEffect } from "react";
import { auth, signInWithGoogle } from "lib/firebase";
import { signOut } from "firebase/auth";
import GrammarCorrection from "components/GrammarCorrection";

export default function GrammarCorrectionPage() {
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
        <GrammarCorrection />
        <br/>
        <button onClick={() => signOut(auth)}>Logout</button>
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
        <title>Grammar Correction Service</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {element}
    </>
  );
}
