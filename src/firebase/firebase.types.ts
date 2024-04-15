import * as admin from 'firebase-admin';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

export interface FirebaseServices {
  auth: firebase.auth.Auth;
  admin: admin.app.App;
}
