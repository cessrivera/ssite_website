import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC4o0K3j2VnBBRDwhTSaZCbQjrMLmI2le8",
  authDomain: "ssite-81018.firebaseapp.com",
  projectId: "ssite-81018",
  storageBucket: "ssite-81018.firebasestorage.app",
  messagingSenderId: "671066397722",
  appId: "1:671066397722:web:b4de27da2a77962484c5a3",
  measurementId: "G-V9QSTJX7H6"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
