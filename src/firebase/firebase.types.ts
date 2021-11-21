import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import * as admin from 'firebase-admin';

export interface FirebaseServices {
  auth: firebase.auth.Auth;
  admin: admin.app.App;
}
