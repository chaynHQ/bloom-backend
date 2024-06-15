// Includes known/expected firebase errors from user inputs
// These errors are returned to the user and display appropriate error messages
// However these errors are ignored from rollbar and error logging
export enum FIREBASE_ERRORS {
  CREATE_USER_FIREBASE_ERROR = 'CREATE_USER_FIREBASE_ERROR',
  CREATE_USER_INVALID_EMAIL = 'CREATE_USER_INVALID_EMAIL',
  CREATE_USER_WEAK_PASSWORD = 'CREATE_USER_WEAK_PASSWORD',
  CREATE_USER_ALREADY_EXISTS = 'CREATE_USER_ALREADY_EXISTS',
}
