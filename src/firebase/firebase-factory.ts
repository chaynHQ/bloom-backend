import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { FirebaseServices } from './firebase.types';
import * as admin from 'firebase-admin';

export const FIREBASE = 'FIREBASE';

export const firebaseFactory = {
  provide: FIREBASE,
  useFactory: (): FirebaseServices => {
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_API_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID,
    };

    const firebaseAdminConfig = {
      type: process.env.FIREBASE_TYPE,
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      clientId: process.env.FIREBASE_CLIENT_ID,
      authUri: process.env.FIREBASE_AUTH_URI,
      tokenUri: process.env.FIREBASE_TOKEN_URI,
      authProviderX509CertUrl: process.env.FIREBASE_CERT_URL,
      clientC509CertUrl: process.env.FIREBASE_CLIENT_CERT,
    };

    firebase.initializeApp(firebaseConfig);
    const adminAuth = admin.initializeApp({
      credential: admin.credential.cert(firebaseAdminConfig),
    });

    return {
      auth: firebase.auth(),
      admin: adminAuth,
    };
  },
};
