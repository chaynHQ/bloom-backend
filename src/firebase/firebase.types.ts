import { Auth as AdminAuth } from 'firebase-admin/auth';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

export interface FirebaseServices {
  auth: firebase.auth.Auth;
  admin: AdminAuth;
}
