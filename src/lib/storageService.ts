import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, FirebaseStorage } from 'firebase/storage';
import { app, FIREBASE_STORAGE_BUCKET } from './firebase';

export type StorageFolder = 'policies' | 'deputy-news' | 'hero-slides' | 'about';

let storageInstance: FirebaseStorage | null = null;

/**
 * Strictly reads VITE_ENABLE_FIREBASE_STORAGE ("true" | "false").
 * On Firebase Spark Plan (free tier), VITE_ENABLE_FIREBASE_STORAGE=false keeps
 * Firebase Cloud Storage completely disabled so no paid Blaze services are triggered.
 */
export function isFirebaseStorageEnabled(): boolean {
  try {
    const raw = import.meta.env?.VITE_ENABLE_FIREBASE_STORAGE;
    if (typeof raw !== 'string') {
      return false;
    }
    return raw.trim().toLowerCase() === 'true';
  } catch {
    return false;
  }
}

function getOptionalStorage(): FirebaseStorage {
  if (!storageInstance) {
    const bucketUrl = FIREBASE_STORAGE_BUCKET ? `gs://${FIREBASE_STORAGE_BUCKET}` : undefined;
    storageInstance = getStorage(app, bucketUrl);
  }
  return storageInstance;
}

export const STORAGE_DISABLED_NOTICE =
  'Penyimpanan file gambar permanen belum tersedia karena Firebase Storage dinonaktifkan pada paket gratis Spark (VITE_ENABLE_FIREBASE_STORAGE=false). Gunakan tautan URL gambar eksternal (https://...) atau pilih cover bawaan yang tersedia.';

/**
 * Uploads an image file ONLY when Firebase Cloud Storage is explicitly enabled
 * (VITE_ENABLE_FIREBASE_STORAGE=true). When disabled on the Spark Plan, it never
 * stores binary files in temporary storage or inside Firestore documents, and
 * returns an honest explanation to the administrator.
 */
export async function uploadImageAsset(
  file: File,
  folder: StorageFolder,
  _maxDimension = 1100,
  _quality = 0.82
): Promise<{ url: string; storageMode: 'firebase-storage' }> {
  if (!isFirebaseStorageEnabled()) {
    throw new Error(STORAGE_DISABLED_NOTICE);
  }

  const storage = getOptionalStorage();
  const cleanName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .slice(0, 80);
  const storagePath = `${folder}/${Date.now()}-${cleanName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, {
    contentType: file.type || 'image/jpeg',
  });
  const downloadUrl = await getDownloadURL(storageRef);
  return {
    url: downloadUrl,
    storageMode: 'firebase-storage',
  };
}

export async function deleteImageAssetIfManaged(imageUrl: string): Promise<void> {
  if (!isFirebaseStorageEnabled() || !imageUrl) {
    return;
  }
  if (
    !imageUrl.includes('firebasestorage.googleapis.com') &&
    !imageUrl.includes('firebasestorage.app')
  ) {
    return;
  }
  try {
    const storage = getOptionalStorage();
    const fileRef = ref(storage, imageUrl);
    await deleteObject(fileRef);
  } catch (err) {
    console.warn('Could not delete Cloud Storage object:', err);
  }
}
