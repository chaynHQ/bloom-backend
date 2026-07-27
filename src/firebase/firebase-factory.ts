import { cert, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import {
  firebaseApiKey,
  firebaseAppId,
  firebaseAuthDomain,
  firebaseAuthUri,
  firebaseCertUrl,
  firebaseClientCert,
  firebaseClientEmail,
  firebaseClientId,
  firebaseMeasurementId,
  firebaseMessagingSenderId,
  firebasePrivateKey,
  firebasePrivateKeyId,
  firebaseProjectId,
  firebaseStorageBucket,
  firebaseTokenUri,
  firebaseType,
} from '../utils/constants';
import { FirebaseServices } from './firebase.types';

export const FIREBASE = 'FIREBASE';

export const firebaseFactory = {
  provide: FIREBASE,
  useFactory: (): FirebaseServices => {
    const firebaseConfig = {
      apiKey: firebaseApiKey,
      authDomain: firebaseAuthDomain,
      projectId: firebaseProjectId,
      storageBucket: firebaseStorageBucket,
      messagingSenderId: firebaseMessagingSenderId,
      appId: firebaseAppId,
      measurementId: firebaseMeasurementId,
    };

    const firebaseAdminConfig = {
      type: firebaseType,
      projectId: firebaseProjectId,
      privateKeyId: firebasePrivateKeyId,
      privateKey: firebasePrivateKey.replace(/\\n/g, '\n'),
      clientEmail: firebaseClientEmail,
      clientId: firebaseClientId,
      authUri: firebaseAuthUri,
      tokenUri: firebaseTokenUri,
      authProviderX509CertUrl: firebaseCertUrl,
      clientC509CertUrl: firebaseClientCert,
    };

    firebase.initializeApp(firebaseConfig);
    const adminApp = initializeAdminApp({
      credential: cert(firebaseAdminConfig),
    });

    return {
      auth: firebase.auth(),
      admin: getAdminAuth(adminApp),
    };
  },
};
