import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import { app, db, auth, googleProvider, firebaseConfig, firestoreDatabaseId } from '../../firebase';

export { app, db, auth, googleProvider, firebaseConfig, firestoreDatabaseId };

// Error Handling Infrastructure complying with Firebase Integration Skill
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  // Surface a clear, actionable Indonesian error message for Admin UI while keeping structured JSON details
  const rawMessage = errInfo.error;
  if (
    rawMessage.includes('Missing or insufficient permissions') ||
    rawMessage.includes('PERMISSION_DENIED')
  ) {
    if (!auth.currentUser) {
      throw new Error(
        'Akses tulis Cloud Firestore ditolak: Anda belum masuk melalui Firebase Authentication. Silakan login kembali di Portal Admin.'
      );
    }
    throw new Error(
      `Akses tulis Cloud Firestore ditolak untuk UID ${auth.currentUser.uid} (${auth.currentUser.email || 'tanpa email'}). Pastikan UID Anda terdaftar sebagai Admin aktif pada koleksi admins.`
    );
  }

  throw new Error(rawMessage || JSON.stringify(errInfo));
}

// Connection Validation Helper
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Periksa konfigurasi Firebase Firestore Anda.');
      return false;
    }
    // Any permission or missing doc error still proves network connectivity to Firestore
    return true;
  }
}

// Initial Boot connection check (browser only)
if (typeof window !== 'undefined') {
  testFirestoreConnection();
}

// Authentication Helpers
export async function signInWithEmailPassword(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signInWithGooglePopup(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    console.error('Firebase Google Sign-In Error:', err);
    throw err;
  }
}

export async function signOutFirebaseUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err: any) {
    console.error('Firebase Sign-Out Error:', err);
    throw err;
  }
}
