/**
 * IndexedDB storage helper for custom phone music ringtones & background notification identity.
 * IndexedDB handles large audio files (MP3, M4A, WAV, OGG, AAC) safely without hitting localStorage or Firestore 1MB limits,
 * and is directly readable from both the Web App and the Service Worker.
 */

const DB_NAME = 'mywahou_storage_db';
const DB_VERSION = 1;
const RINGTONE_STORE = 'custom_ringtones';
const META_STORE = 'app_meta';

function openStorageDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof window === 'undefined' || !('indexedDB' in window)) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(RINGTONE_STORE)) {
          db.createObjectStore(RINGTONE_STORE, { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export interface StoredCustomRingtone {
  userId: string;
  fileName: string;
  mimeType: string;
  dataBuffer: ArrayBuffer;
  updatedAt: number;
}

export async function saveCustomRingtoneFile(userId: string, file: File): Promise<StoredCustomRingtone> {
  const buffer = await file.arrayBuffer();
  const record: StoredCustomRingtone = {
    userId,
    fileName: file.name,
    mimeType: file.type || 'audio/mpeg',
    dataBuffer: buffer,
    updatedAt: Date.now(),
  };

  try {
    const db = await openStorageDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(RINGTONE_STORE, 'readwrite');
      tx.objectStore(RINGTONE_STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not save custom ringtone in IndexedDB:', err);
  }

  // Also cache selection metadata quickly in localStorage
  saveUserRingtoneMeta(userId, 'custom_file', file.name);
  return record;
}

export async function getCustomRingtoneObjectUrl(userId: string): Promise<{ url: string; fileName: string } | null> {
  if (!userId) return null;
  try {
    const db = await openStorageDb();
    const record = await new Promise<StoredCustomRingtone | undefined>((resolve, reject) => {
      const tx = db.transaction(RINGTONE_STORE, 'readonly');
      const req = tx.objectStore(RINGTONE_STORE).get(userId);
      req.onsuccess = () => resolve(req.result as StoredCustomRingtone | undefined);
      req.onerror = () => reject(req.error);
    });
    if (!record || !record.dataBuffer) return null;
    const blob = new Blob([record.dataBuffer], { type: record.mimeType || 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    return { url, fileName: record.fileName };
  } catch (err) {
    console.warn('Error loading custom ringtone from IndexedDB:', err);
    return null;
  }
}

export async function deleteCustomRingtoneFile(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const db = await openStorageDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(RINGTONE_STORE, 'readwrite');
      tx.objectStore(RINGTONE_STORE).delete(userId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export function saveUserRingtoneMeta(userId: string, ringtoneId: string, customRingtoneName?: string) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(
      `mywahou_ringtone_${userId}`,
      JSON.stringify({ ringtoneId, customRingtoneName: customRingtoneName || '' })
    );
  } catch {}
}

export function getUserRingtoneMeta(userId?: string): { ringtoneId: string; customRingtoneName?: string } {
  if (typeof window === 'undefined' || !userId) {
    return { ringtoneId: 'wahou_1' };
  }
  try {
    const raw = localStorage.getItem(`mywahou_ringtone_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ringtoneId: parsed.ringtoneId || 'wahou_1',
        customRingtoneName: parsed.customRingtoneName || '',
      };
    }
  } catch {}
  return { ringtoneId: 'wahou_1' };
}

export interface BackgroundNotifConfig {
  userId: string;
  displayName: string;
  enabled: boolean;
  updatedAt: number;
}

export async function saveBackgroundNotifConfig(config: BackgroundNotifConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('mywahou_bg_notif_config', JSON.stringify(config));
  } catch {}
  try {
    const db = await openStorageDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      tx.objectStore(META_STORE).put({ key: 'bg_notif_config', ...config });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export function getBackgroundNotifConfigSync(): BackgroundNotifConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('mywahou_bg_notif_config');
    return raw ? (JSON.parse(raw) as BackgroundNotifConfig) : null;
  } catch {
    return null;
  }
}
