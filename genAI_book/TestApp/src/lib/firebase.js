import { initializeApp } from "firebase/app";
import { getAuth,
         GoogleAuthProvider,
         signInWithPopup } from "firebase/auth";
import { firebaseConfig } from ".firebase";

try {
  initializeApp(firebaseConfig);
} catch (err) {
  if (!/already exists/.test(err.message)) {
    console.error('Firebase initialization error', err.stack);
  }
}

export const auth = getAuth();

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  signInWithPopup(auth, provider)
    .catch((error) => {console.log(error)})
};
