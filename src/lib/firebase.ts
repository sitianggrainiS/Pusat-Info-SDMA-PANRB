import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, GoogleAuthProvider, User } from 'firebase/auth';
import {
  Firestore,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  memoryLruGarbageCollector,
} from 'firebase/firestore';
import {
  Firestore as LiteFirestore,
  getFirestore as getLiteFirestore,
} from 'firebase/firestore/lite';
import firebaseConfig from '../../firebase-applet-config.json';
import { AdminUser } from '../types';
import { AUTHORIZED_ADMIN_USERS } from '../data/adminUsers';

/**
 * Strictly resolves the dedicated AI Studio Firestore Database ID for project "sdmaapp".
 * Never falls back to "(default)" and explicitly rejects invalid runtime values (such as "false").
 */
function resolveDedicatedAiStudioDatabaseId(): string {
  const configured = (firebaseConfig.firestoreDatabaseId || '').trim();
  const invalidValues = new Set(['', 'false', 'true', 'null', 'undefined', '(default)']);
  if (invalidValues.has(configured.toLowerCase())) {
    throw new Error(
      'Konfigurasi firestoreDatabaseId khusus AI Studio pada firebase-applet-config.json tidak valid.'
    );
  }
  return configured;
}

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const PROVISIONED_DATABASE_ID = resolveDedicatedAiStudioDatabaseId();
export const FIRESTORE_DATABASE_ID = PROVISIONED_DATABASE_ID;
export const FIREBASE_STORAGE_BUCKET = firebaseConfig.storageBucket;

interface KompakFirebaseSingleton {
  key: string;
  app: FirebaseApp;
  db: Firestore;
  liteDb: LiteFirestore;
  auth: Auth;
  assertionTripped: boolean;
  assertionReason: string | null;
  assertionCount: number;
  assertionListeners: Set<(reason: string) => void>;
  windowGuardInstalled: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __KOMPAK_FIREBASE_SINGLETON__: KompakFirebaseSingleton | undefined;
}

function getOrCreateFirebaseSingleton(): KompakFirebaseSingleton {
  const singletonKey = `${FIREBASE_PROJECT_ID}::${FIRESTORE_DATABASE_ID}`;
  const existing = globalThis.__KOMPAK_FIREBASE_SINGLETON__;
  if (existing && existing.key === singletonKey) {
    return existing;
  }

  const firebaseApp: FirebaseApp =
    getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  let firestoreDb: Firestore;
  try {
    // Non-conflicting memory LRU cache (avoids eager target eviction during stream teardown
    // and avoids multi-tab IndexedDB persistence lock conflicts in preview iFrames).
    firestoreDb = initializeFirestore(
      firebaseApp,
      {
        localCache: memoryLocalCache({
          garbageCollector: memoryLruGarbageCollector({
            cacheSizeBytes: 40 * 1024 * 1024,
          }),
        }),
        ...(isBrowser ? { experimentalAutoDetectLongPolling: true } : {}),
      },
      FIRESTORE_DATABASE_ID
    );
  } catch {
    firestoreDb = getFirestore(firebaseApp, FIRESTORE_DATABASE_ID);
  }

  // Stateless REST client bound to the exact same dedicated AI Studio database.
  // Used only as a safe read fallback if the stateful SDK queue ever trips an internal assertion.
  const firestoreLiteDb = getLiteFirestore(firebaseApp, FIRESTORE_DATABASE_ID);
  const firebaseAuth = getAuth(firebaseApp);

  const created: KompakFirebaseSingleton = {
    key: singletonKey,
    app: firebaseApp,
    db: firestoreDb,
    liteDb: firestoreLiteDb,
    auth: firebaseAuth,
    assertionTripped: false,
    assertionReason: null,
    assertionCount: 0,
    assertionListeners: new Set(),
    windowGuardInstalled: false,
  };

  globalThis.__KOMPAK_FIREBASE_SINGLETON__ = created;
  return created;
}

const singleton = getOrCreateFirebaseSingleton();

export const app: FirebaseApp = singleton.app;
export const db: Firestore = singleton.db;
export const liteDb: LiteFirestore = singleton.liteDb;
export const auth: Auth = singleton.auth;

/**
 * Detects Firebase JS SDK internal state assertions (such as WatchChangeAggregator / TargetState ca9
 * and AsyncQueue b815) so we NEVER retry endlessly or recreate listeners on a failed SDK queue.
 */
export function isFirestoreInternalAssertion(error: unknown): boolean {
  const msg = String((error as any)?.message || error || '').toLowerCase();
  return (
    msg.includes('internal assertion failed') ||
    msg.includes('unexpected state') ||
    msg.includes('id: b815') ||
    msg.includes('id: ca9') ||
    msg.includes('(b815)') ||
    msg.includes('(ca9)') ||
    msg.includes('watchchangeaggregator') ||
    msg.includes('persistentlistenstream')
  );
}

export function markFirestoreInternalAssertion(reason: string): void {
  singleton.assertionCount += 1;
  if (!singleton.assertionTripped) {
    singleton.assertionTripped = true;
    singleton.assertionReason = reason;
    singleton.assertionListeners.forEach((listener) => {
      try {
        listener(reason);
      } catch {
        // Ignore listener errors
      }
    });
  }
}

export function hasFirestoreInternalAssertionTripped(): boolean {
  return singleton.assertionTripped;
}

export function getFirestoreInternalAssertionState(): {
  tripped: boolean;
  reason: string | null;
  count: number;
} {
  return {
    tripped: singleton.assertionTripped,
    reason: singleton.assertionReason,
    count: singleton.assertionCount,
  };
}

export function subscribeInternalAssertionTripped(
  listener: (reason: string) => void
): () => void {
  singleton.assertionListeners.add(listener);
  return () => {
    singleton.assertionListeners.delete(listener);
  };
}

// Install a single idempotent global guard in browser environments to intercept uncaught
// background PersistentListenStream / AsyncQueue internal assertions without crashing the UI.
if (typeof window !== 'undefined' && !singleton.windowGuardInstalled) {
  singleton.windowGuardInstalled = true;

  window.addEventListener('error', (event) => {
    const candidate = event.error || event.message;
    if (isFirestoreInternalAssertion(candidate)) {
      event.preventDefault();
      markFirestoreInternalAssertion(
        event.error instanceof Error ? event.error.message : String(event.message)
      );
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isFirestoreInternalAssertion(event.reason)) {
      event.preventDefault();
      markFirestoreInternalAssertion(
        event.reason instanceof Error ? event.reason.message : String(event.reason)
      );
    }
  });
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const BOOTSTRAPPED_ADMIN_EMAILS = [
  'sitianggraini.s.02@gmail.com',
  'tim.kontensdma@menpan.go.id',
  'afid.sdma@menpan.go.id',
  'aghni.sdma@menpan.go.id',
  'editor@menpan.go.id',
];

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
  if (isFirestoreInternalAssertion(error)) {
    markFirestoreInternalAssertion(error instanceof Error ? error.message : String(error));
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
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
  throw new Error(JSON.stringify(errInfo));
}

export function resolveAuthorizedAdminFromFirebaseUser(fbUser: User | null): AdminUser | null {
  if (!fbUser || !fbUser.email || !fbUser.emailVerified) {
    return null;
  }
  const cleanEmail = fbUser.email.trim().toLowerCase();
  if (!BOOTSTRAPPED_ADMIN_EMAILS.includes(cleanEmail)) {
    return null;
  }

  const matched = AUTHORIZED_ADMIN_USERS.find(
    (u) => u.email.trim().toLowerCase() === cleanEmail
  );
  if (matched) {
    const { passwordHash: _, ...safeUser } = matched;
    return safeUser;
  }

  return {
    id: 'adm-owner-01',
    name: fbUser.displayName || 'Siti Anggraini Sulistiowati',
    email: cleanEmail,
    role: 'superadmin',
    roleTitle: 'Super Administrator SDMA',
    department: 'Kedeputian Bidang SDM Aparatur - Kementerian PANRB',
    permissions: {
      canManageUsers: true,
      canPublishPolicies: true,
      canEditCategories: true,
      canManageSources: true,
      canUseAI: true,
    },
  };
}
