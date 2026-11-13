/** Keep service/configuration failures distinct from incorrect credentials. */
export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Invalid username or password.",
    "auth/user-not-found": "Invalid username or password.",
    "auth/wrong-password": "Invalid username or password.",
    "auth/email-already-in-use":
      "This username already exists. Sign in with its password, or choose another username.",
    "auth/operation-not-allowed":
      "Email/Password sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method.",
    "auth/configuration-not-found":
      "Firebase Authentication is not configured. Open Firebase Console → Authentication → Get started and enable Email/Password.",
    "auth/invalid-api-key":
      "The Firebase API key is invalid. Check .env against your Firebase web app configuration and restart the development server.",
    "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      "The Firebase API key is invalid. Correct .env and restart the development server.",
    "auth/unauthorized-domain":
      "Add this host to Firebase Authentication → Settings → Authorized domains.",
    "auth/network-request-failed":
      "Cannot reach Firebase. Check your internet connection and try again.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/weak-password":
      "Choose a stronger password that meets the Firebase password policy.",
    "permission-denied":
      "Firestore denied access. Publish this project’s firestore.rules to the Firebase project configured in .env.",
    unavailable:
      "Firestore is unavailable. Check your internet connection and database setup.",
  };
  return (
    messages[code] ??
    (error instanceof Error
      ? error.message
      : "Authentication failed. Please try again.")
  );
}
