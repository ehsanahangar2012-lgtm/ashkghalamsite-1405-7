export interface LocalCmsAsset {
  id: string;
  name: string;
  data: string;
  type: string;
  size: number;
}

const DATABASE_NAME = 'ashkghalam-cms';
const ASSET_STORE = 'assets';

export const readLocalCmsState = <T,>(key: string, fallback: T): T => {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const writeLocalCmsState = (key: string, value: unknown): boolean => {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const openAssetDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    reject(new Error('IndexedDB is unavailable'));
    return;
  }

  const request = indexedDB.open(DATABASE_NAME, 1);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(ASSET_STORE)) {
      database.createObjectStore(ASSET_STORE, { keyPath: 'id' });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Could not open local media database'));
});

const withAssetStore = async <T,>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const database = await openAssetDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(ASSET_STORE, mode);
    const request = operation(transaction.objectStore(ASSET_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Local media operation failed'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Local media transaction failed'));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error('Local media transaction aborted'));
    };
  });
};

export const readLocalCmsAssets = (): Promise<LocalCmsAsset[]> =>
  withAssetStore<LocalCmsAsset[]>('readonly', store => store.getAll());

export const writeLocalCmsAsset = (asset: LocalCmsAsset): Promise<IDBValidKey> =>
  withAssetStore<IDBValidKey>('readwrite', store => store.put(asset));

export const deleteLocalCmsAsset = (id: string): Promise<undefined> =>
  withAssetStore<undefined>('readwrite', store => store.delete(id));
