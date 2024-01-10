import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { auth, signInWithGoogle } from "lib/firebase";
import { signOut } from "firebase/auth";
import SmartDrive from "components/SmartDrive";

export default function SmartDrivePage() {
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
        <SmartDrive />
        <br/>
        <button onClick={() => signOut(auth)}>Logout</button>
        <br/><Link href="/documentQA">Document QA Service</Link>
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
        <title>Smart Drive</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {element}
    </>
  );
}
