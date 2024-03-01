import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { auth, signInWithGoogle } from "lib/firebase";
import { signOut } from "firebase/auth";

export default function LoginMenuPage() {
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
        <h1>Welcome, {loginUser.displayName}!</h1>
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
        <title>Login Menu</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {element}
      <h3><Link href="./">Home Page</Link></h3>
    </>
  );
}
