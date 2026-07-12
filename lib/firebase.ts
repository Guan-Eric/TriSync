import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getExtra } from './config';

const firebaseConfig = {
  apiKey: getExtra('firebaseApiKey', 'demo-api-key'),
  authDomain: getExtra('authDomain', 'trisync-demo.firebaseapp.com'),
  projectId: getExtra('projectId', 'trisync-demo'),
  storageBucket: getExtra('storageBucket', 'trisync-demo.appspot.com'),
  messagingSenderId: getExtra('messagingSenderId', '000000000000'),
  appId: getExtra('appId', '1:000000000000:ios:demo'),
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseApp = app;
export const auth = getAuth(app);
export const db = getFirestore(app);
