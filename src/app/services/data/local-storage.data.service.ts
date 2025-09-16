import { Injectable } from '@angular/core';
import { IDataService } from './interfaces/i-data.service';

type WithId = { id: string } & Record<string, unknown>;

@Injectable()
export class DataLocalStorageService implements IDataService {

  async initialize(): Promise<void> {
    // no-op for local storage
  }

  public async readDocuments<T>(collectionName: string, isPrivate?: boolean): Promise<T[]> {
    const key = this.colKey(collectionName, isPrivate);
    const store = this.readCol(key);
    return Object.values(store) as T[];
  }

  public async readDocument<T>(collectionName: string, id: string, isPrivate?: boolean): Promise<T | undefined> {
    const key = this.colKey(collectionName, isPrivate);
    const store = this.readCol(key);
    return store[id] as T | undefined;
  }

  public async createDocument<T>(collectionName: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
    const doc = data as unknown as WithId;
    if (!doc.id) {
      console.error('Document must contain an id property');
      return undefined;
    }
    const key = this.colKey(collectionName, isPrivate);
    const store = this.readCol(key);
    if (store[doc.id]) {
      console.warn(`Document ${doc.id} already exists, refusing to overwrite`);
      return undefined;
    }
    store[doc.id] = data;
    this.writeCol(key, store);
    return data;
  }

  public async createOrUpdateDocument<T>(
    collectionName: string,
    data: T,
    isPrivate?: boolean
  ): Promise<T | undefined> {
    const doc = data as unknown as WithId;
    if (!doc.id) {
      console.error('Document must contain an id property');
      return undefined;
    }
    const key = this.colKey(collectionName, isPrivate);
    const store = this.readCol(key);
    store[doc.id] = data;
    this.writeCol(key, store);
    return data;
  }

  public async updateDocument<T>(collectionName: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
    const doc = data as unknown as WithId;
    if (!doc.id) {
      console.error('Document must contain an id property');
      return undefined;
    }
    const key = this.colKey(collectionName, isPrivate);
    const store = this.readCol(key);
    if (!store[doc.id]) {
      console.warn(`Document ${doc.id} does not exist, update skipped`);
      return undefined;
    }
    store[doc.id] = data;
    this.writeCol(key, store);
    return data;
  }

  public async deleteDocument(collectionName: string, id: string, isPrivate?: boolean): Promise<void> {
    const key = this.colKey(collectionName, isPrivate);
    const store = this.readCol(key);
    if (store[id]) {
      delete store[id];
      this.writeCol(key, store);
    }
  }

  public async setValue<T>(id: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
    localStorage.setItem(this.kvKey(id, isPrivate), JSON.stringify(data));
    return data;
  }

  public async getValue<T>(id: string, isPrivate?: boolean): Promise<T | undefined> {
    const raw = localStorage.getItem(this.kvKey(id, isPrivate));
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      console.warn(`Corrupt value for key ${id}, clearing`);
      localStorage.removeItem(this.kvKey(id, isPrivate));
      return undefined;
    }
  }

  private colKey(collectionName: string, isPrivate?: boolean): string {
    const scope = isPrivate ? 'user' : 'account';
    return `data:col:${scope}:${collectionName}`;
  }

  private kvKey(id: string, isPrivate?: boolean): string {
    const scope = isPrivate ? 'user' : 'account';
    return `data:kv:${scope}:${id}`;
  }

  private readCol(collectionKey: string): Record<string, unknown> {
    const raw = localStorage.getItem(collectionKey);
    if (!raw) return {};
    try {
      const col = JSON.parse(raw) as Record<string, unknown>;
      console.log('readCol', collectionKey, col);
      return col;
    } catch {
      console.warn(`Corrupt collection payload at ${collectionKey}, resetting`);
      localStorage.removeItem(collectionKey);
      return {};
    }
  }

  private writeCol(collectionKey: string, data: Record<string, unknown>): void {
    console.log('writeCol', collectionKey, data);
    localStorage.setItem(collectionKey, JSON.stringify(data));
  }
}