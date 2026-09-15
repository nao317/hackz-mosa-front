import { getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";

export type AuthUser = {
  id: string;
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
  photoUrl: string | null;
  providers: string[];
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function hasFirebaseConfig() {
  return Object.values(firebaseConfig).every(
    (value) => typeof value === "string" && value.length > 0,
  );
}

function getClientAuth(): Auth {
  if (!hasFirebaseConfig()) {
    throw new Error("Firebaseの接続設定が完了していません。");
  }

  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  return getAuth(app);
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.uid,
    displayName: user.displayName,
    email: user.email,
    emailVerified: user.emailVerified,
    photoUrl: user.photoURL,
    providers: user.providerData.map((provider) => provider.providerId),
  };
}

async function syncSessionWithBackend(user: User): Promise<void> {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

  const idToken = await user.getIdToken();
  const response = await fetch(`${apiBaseUrl}/api/auth/session`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("サーバーとの認証同期に失敗しました。");
  }
}

async function finishSignIn(user: User): Promise<AuthUser> {
  await syncSessionWithBackend(user);
  return toAuthUser(user);
}

export function observeAuthState(
  onChange: (user: AuthUser | null) => void,
): () => void {
  if (!hasFirebaseConfig()) {
    onChange(null);
    return () => undefined;
  }

  let isInitialEmission = true;

  return onAuthStateChanged(getClientAuth(), (user) => {
    if (isInitialEmission && user) {
      void syncSessionWithBackend(user).catch(() => undefined);
    }
    isInitialEmission = false;
    onChange(user ? toAuthUser(user) : null);
  });
}

export async function signInWithGoogle(): Promise<AuthUser> {
  const result = await signInWithPopup(getClientAuth(), new GoogleAuthProvider());
  return finishSignIn(result.user);
}

export async function signInWithApple(): Promise<AuthUser> {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  const result = await signInWithPopup(getClientAuth(), provider);
  return finishSignIn(result.user);
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthUser> {
  const result = await signInWithEmailAndPassword(
    getClientAuth(),
    email,
    password,
  );
  return finishSignIn(result.user);
}

export async function createAccountWithEmail(
  email: string,
  password: string,
): Promise<AuthUser> {
  const result = await createUserWithEmailAndPassword(
    getClientAuth(),
    email,
    password,
  );
  return finishSignIn(result.user);
}

export async function signOutCurrentUser(): Promise<void> {
  const auth = getClientAuth();
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

  await signOut(auth);
  await fetch(`${apiBaseUrl}/api/auth/session`, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getClientAuth(), email);
}
