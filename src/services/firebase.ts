import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
let anonAttemptPromise: Promise<User | null> | null = null;
let anonAuthBlocked = false;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore operation notice:', errInfo.operationType, errInfo.path, errInfo.error);
  throw new Error(JSON.stringify(errInfo));
}

export async function ensureCloudAuth(forceRetry = false): Promise<User | null> {
  // Wait for Firebase Auth IndexedDB persistence to restore before checking currentUser
  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
  } catch {
    // Ignore authStateReady errors offline
  }

  if (auth.currentUser) {
    anonAuthBlocked = false;
    return auth.currentUser;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  if (anonAuthBlocked && !forceRetry) return null;

  if (anonAttemptPromise) return anonAttemptPromise;

  anonAttemptPromise = (async () => {
    try {
      const cred = await signInAnonymously(auth);
      anonAuthBlocked = false;
      return cred.user;
    } catch (err: any) {
      const code = err?.code || '';
      if (
        code === 'auth/operation-not-allowed' ||
        code === 'auth/admin-restricted-operation'
      ) {
        anonAuthBlocked = true;
      }
      return null;
    } finally {
      anonAttemptPromise = null;
    }
  })();

  return anonAttemptPromise;
}

export async function signInWithGoogle(): Promise<{ user: User | null; error?: string }> {
  try {
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      try {
        const linked = await linkWithPopup(auth.currentUser, googleProvider);
        anonAuthBlocked = false;
        return { user: linked.user };
      } catch (linkErr: any) {
        const linkCode = linkErr?.code || '';
        if (
          linkCode !== 'auth/credential-already-in-use' &&
          linkCode !== 'auth/email-already-in-use' &&
          linkCode !== 'auth/provider-already-linked'
        ) {
          throw linkErr;
        }
      }
    }
    const result = await signInWithPopup(auth, googleProvider);
    anonAuthBlocked = false;
    return { user: result.user };
  } catch (err: any) {
    return {
      user: null,
      error: err?.message || 'Google sign-in cancelled or blocked.',
    };
  }
}

export async function signOutCloud(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // Ignore signout error
  }
}

export function subscribeAuthState(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export function getCurrentAuthStatus(): {
  uid: string | null;
  isAnonymous: boolean;
  displayName: string | null;
  email: string | null;
  anonAuthBlocked: boolean;
} {
  return {
    uid: auth.currentUser?.uid || null,
    isAnonymous: !!auth.currentUser?.isAnonymous,
    displayName: auth.currentUser?.displayName || null,
    email: auth.currentUser?.email || null,
    anonAuthBlocked,
  };
}

export async function testConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch {
    return false;
  }
}
