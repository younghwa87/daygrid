import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB_nOzWY8sKzFx0Irhq8ttrN1APTq1ORBQ",
  authDomain: "datile-27170.firebaseapp.com",
  projectId: "datile-27170",
  storageBucket: "datile-27170.firebasestorage.app",
  messagingSenderId: "516657531439",
  appId: "1:516657531439:web:7a28b7dbcb8f24c303d4da",
};

// TODO: Firebase Console → Authentication → Sign-in method → Google → 웹 클라이언트 ID
export const GOOGLE_WEB_CLIENT_ID =
  "516657531439-v0palrm8l5q8ofv9e68s8nejo2caflps.apps.googleusercontent.com";

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
