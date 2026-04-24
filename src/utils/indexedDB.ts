/**
 * Generic IndexedDB Service
 * Provides reusable IndexedDB operations with type safety and pagination support
 */

export type IDBConfig = {
  dbName: string;
  version: number;
  stores: IDBStoreConfig[];
};

export type IDBStoreConfig = {
  name: string;
  keyPath: string;
  indexes?: IDBIndexConfig[];
};

export type IDBIndexConfig = {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
};

export type PaginationOptions = {
  limit: number;
  offset?: number;
  direction?: 'next' | 'prev';
};

export interface PaginationResult<T> {
  items: T[];
  hasMore: boolean;
  totalCount?: number;
}

export type QueryOptions = {
  index?: string;
  range?: IDBKeyRange;
  direction?: IDBCursorDirection;
};

export class IndexedDBService<T extends { [key: string]: any }> {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private config: IDBConfig;

  constructor(config: IDBConfig) {
    this.config = config;
  }

  private async openDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.config.dbName, this.config.version);

        request.onupgradeneeded = () => {
          const db = request.result;

          // Create stores
          this.config.stores.forEach(storeConfig => {
            if (!db.objectStoreNames.contains(storeConfig.name)) {
              const store = db.createObjectStore(storeConfig.name, {
                keyPath: storeConfig.keyPath
              });

              // Create indexes
              storeConfig.indexes?.forEach(indexConfig => {
                store.createIndex(indexConfig.name, indexConfig.keyPath, indexConfig.options);
              });
            }
          });
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          this.dbPromise = null;
          reject(request.error);
        };
      });
    }

    return this.dbPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.openDB();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  async create(item: T): Promise<void> {
    const store = await this.getStore(this.config.stores[0].name, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async read(key: string | number): Promise<T | undefined> {
    const store = await this.getStore(this.config.stores[0].name);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async update(item: T): Promise<void> {
    const store = await this.getStore(this.config.stores[0].name, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: string | number): Promise<void> {
    const store = await this.getStore(this.config.stores[0].name, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async find(query: QueryOptions = {}): Promise<T[]> {
    const store = await this.getStore(this.config.stores[0].name);
    const index = query.index ? store.index(query.index) : store;

    return new Promise((resolve, reject) => {
      const request = index.openCursor(query.range, query.direction);
      const results: T[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async findOne(query: QueryOptions = {}): Promise<T | undefined> {
    const store = await this.getStore(this.config.stores[0].name);
    const index = query.index ? store.index(query.index) : store;

    return new Promise((resolve, reject) => {
      const request = index.openCursor(query.range, query.direction);

      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor ? cursor.value : undefined);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async paginate(options: PaginationOptions, query: QueryOptions = {}): Promise<PaginationResult<T>> {
    const store = await this.getStore(this.config.stores[0].name);
    const index = query.index ? store.index(query.index) : store;

    return new Promise((resolve, reject) => {
      const direction = options.direction === 'prev' ? 'prev' : 'next';
      const request = index.openCursor(query.range, direction);
      const items: T[] = [];
      let count = 0;
      let hasMore = false;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && count < options.limit) {
          if (options.offset && options.offset > 0) {
            options.offset--;
            cursor.continue();
            return;
          }

          items.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          if (cursor) {
            hasMore = true;
          }
          resolve({ items, hasMore });
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async count(query: QueryOptions = {}): Promise<number> {
    const store = await this.getStore(this.config.stores[0].name);
    const index = query.index ? store.index(query.index) : store;

    return new Promise((resolve, reject) => {
      const request = index.count(query.range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    const store = await this.getStore(this.config.stores[0].name, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteByQuery(query: QueryOptions = {}): Promise<void> {
    const store = await this.getStore(this.config.stores[0].name, 'readwrite');
    const index = query.index ? store.index(query.index) : store;

    return new Promise((resolve, reject) => {
      const request = index.openCursor(query.range);

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /** Walks the whole object store and deletes rows for which `predicate` returns true. */
  async deleteWhere(predicate: (item: T) => boolean): Promise<void> {
    const store = await this.getStore(this.config.stores[0].name, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          if (predicate(cursor.value)) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}

// Factory function to create typed service instances
export function createIndexedDBService<T extends { [key: string]: any }>(config: IDBConfig): IndexedDBService<T> {
  return new IndexedDBService<T>(config);
}

// Utility function to check if IndexedDB is available
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}