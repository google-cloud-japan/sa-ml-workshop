import admin from "firebase-admin";

try {
  admin.initializeApp();
} catch (err) {
  if (!/already exists/.test(err.message)) {
    console.error('Firebase initialization error', err.stack)
  }
}

export async function verifyIdToken(req) {
  const idToken = req.body.token;
  var decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    decodedToken = null;
  }
  return decodedToken;
}
