import Head from "next/head";
import { useState, useEffect } from "react";
import { auth, signInWithGoogle } from "lib/firebase";
import { signOut } from "firebase/auth";
import FashionCompliment from "components/FashionCompliment";

export default function FashionComplimentPage() {
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
        <FashionCompliment />
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
        <title>Fashion Compliment Service</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {element}
    </>
  );
}
