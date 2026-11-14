import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
const GUEST_USERNAME_STORAGE_KEY = 'fambai_guest_username';
const GUEST_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789';

let anonAttemptPromise: Promise<User | null> | null = null;
let anonAuthBlocked = false;

export function generateGuestUsername(): string {
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += GUEST_ALPHABET.charAt(Math.floor(Math.random() * GUEST_ALPHABET.length));
  }
  return `guest_${suffix}`;
}

export function getOrCreateGuestUsername(): string {
  try {
    let name = localStorage.getItem(GUEST_USERNAME_STORAGE_KEY);
    if (!name || !/^guest_[A-Za-z0-9]{3,16}$/.test(name)) {
      name = generateGuestUsername();
      localStorage.setItem(GUEST_USERNAME_STORAGE_KEY, name);
    }
    return name;
  } catch {
    return generateGuestUsername();
  }
}

export function saveGuestUsername(guestName: string): void {
  try {
    localStorage.setItem(GUEST_USERNAME_STORAGE_KEY, guestName);
  } catch {
    // Ignore storage error
  }
}

export function clearSavedGuestUsername(): void {
  try {
    localStorage.removeItem(GUEST_USERNAME_STORAGE_KEY);
  } catch {
    // Ignore storage error
  }
}

export async function syncFirebaseDisplayName(displayName: string): Promise<void> {
  if (!auth.currentUser || !displayName.trim()) return;
  try {
    if (auth.currentUser.displayName !== displayName.trim()) {
      await updateProfile(auth.currentUser, { displayName: displayName.trim().slice(0, 40) });
    }
  } catch {
    // Ignore transient profile update error when offline
  }
}

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

export async function ensureCloudAuth(
  forceRetry = false,
  preferredGuestUsername?: string
): Promise<User | null> {
  // Wait for Firebase Auth IndexedDB persistence to restore before checking currentUser
  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
  } catch {
    // Ignore authStateReady errors offline
  }

  const guestName = preferredGuestUsername || getOrCreateGuestUsername();

  if (auth.currentUser) {
    anonAuthBlocked = false;
    if (auth.currentUser.isAnonymous && !auth.currentUser.displayName) {
      await syncFirebaseDisplayName(guestName);
    }
    return auth.currentUser;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  if (anonAuthBlocked && !forceRetry) return null;

  if (anonAttemptPromise) return anonAttemptPromise;

  anonAttemptPromise = (async () => {
    try {
      const cred = await signInAnonymously(auth);
      anonAuthBlocked = false;
      await syncFirebaseDisplayName(guestName);
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

export async function continueAsGuest(preferredGuestUsername?: string): Promise<{
  user: User | null;
  guestName: string;
  error?: string;
  operationNotAllowed?: boolean;
}> {
  const guestName = preferredGuestUsername || getOrCreateGuestUsername();
  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    if (auth.currentUser) {
      if (auth.currentUser.isAnonymous) {
        await syncFirebaseDisplayName(guestName);
      }
      anonAuthBlocked = false;
      return { user: auth.currentUser, guestName };
    }
    const cred = await signInAnonymously(auth);
    anonAuthBlocked = false;
    await syncFirebaseDisplayName(guestName);
    return { user: cred.user, guestName };
  } catch (err: any) {
    const code = err?.code || '';
    const isDisabled =
      code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation';
    if (isDisabled) {
      anonAuthBlocked = true;
    }
    return {
      user: null,
      guestName,
      operationNotAllowed: isDisabled,
      error: isDisabled
        ? 'Enable Anonymous Sign-In in Firebase Console (Authentication → Sign-in method → Anonymous) to activate automatic guest sync, or sign in with Google.'
        : err?.message || 'Guest sign-in failed.',
    };
  }
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
  guestUsername: string;
} {
  return {
    uid: auth.currentUser?.uid || null,
    isAnonymous: !!auth.currentUser?.isAnonymous,
    displayName: auth.currentUser?.displayName || null,
    email: auth.currentUser?.email || null,
    anonAuthBlocked,
    guestUsername: getOrCreateGuestUsername(),
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
