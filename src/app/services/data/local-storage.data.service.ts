import { Injectable } from '@angular/core';
import { IDataService } from './interfaces/i-data.service';
import { environment } from '../../../environments/environment';

type WithId = { id: string } & Record<string, unknown>;

@Injectable()
export class DataLocalStorageService implements IDataService {

  async initialize(): Promise<void> {
    // no-op for local storage
  }

  public async readDocuments<T>(collectionName: string, isPrivate?: boolean): Promise<T[]> {
    const prefix = this.docPrefix(collectionName, isPrivate);
    const docs: T[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const doc = JSON.parse(raw) as T;
          this.debugLog('Read document', key, doc);
          docs.push(doc);
        } catch {
          console.warn(`[IDataService] Corrupt document payload at ${key}, skipping`);
        }
      }
    }
    return docs;
  }

  public async readDocument<T>(collectionName: string, id: string, isPrivate?: boolean): Promise<T | undefined> {
    const key = this.docKey(collectionName, id, isPrivate);
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    try {
      const doc = JSON.parse(raw) as T;
      this.debugLog('Read document', key, doc);
      return doc;
    } catch {
      console.warn(`[IDataService] Corrupt document payload for ${id}, clearing`);
      localStorage.removeItem(key);
      return undefined;
    }
  }

  public async createDocument<T>(collectionName: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
    const doc = data as unknown as WithId;
    if (!doc.id) {
      console.error('[IDataService] Document must contain an id property');
      return undefined;
    }
    const key = this.docKey(collectionName, doc.id, isPrivate);
    if (localStorage.getItem(key)) {
      console.warn(`[IDataService] Document ${doc.id} already exists, refusing to overwrite`);
      return undefined;
    }
    localStorage.setItem(key, JSON.stringify(data));
    this.debugLog('Created document', key, data);
    return data;
  }

  public async createOrUpdateDocument<T>(collectionName: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
    const doc = data as unknown as WithId;
    if (!doc.id) {
      console.error('[IDataService] Document must contain an id property');
      return undefined;
    }
    const key = this.docKey(collectionName, doc.id, isPrivate);
    localStorage.setItem(key, JSON.stringify(data));
    this.debugLog('Created/Updated document', key, data);
    return data;
  }

  public async updateDocument<T>(collectionName: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
    const doc = data as unknown as WithId;
    if (!doc.id) {
      console.error('[IDataService] Document must contain an id property');
      return undefined;
    }
    const key = this.docKey(collectionName, doc.id, isPrivate);
    if (!localStorage.getItem(key)) {
      console.warn(`[IDataService] Document ${doc.id} does not exist, update skipped`);
      return undefined;
    }
    localStorage.setItem(key, JSON.stringify(data));
    this.debugLog('Updated document', key, data);
    return data;
  }

  public async deleteDocument(collectionName: string, id: string, isPrivate?: boolean): Promise<void> {
    const key = this.docKey(collectionName, id, isPrivate);
    localStorage.removeItem(key);
    this.debugLog('Deleted document', key);
  }

  public async setValue<T>(id: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
    const key = this.kvKey(id, isPrivate);
    localStorage.setItem(key, JSON.stringify(data));
    this.debugLog('Set value', key, data);
    return data;
  }

  public async getValue<T>(id: string, isPrivate?: boolean): Promise<T | undefined> {
    const key = this.kvKey(id, isPrivate);
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    try {
      const value = JSON.parse(raw) as T;
      this.debugLog('Get value', key, value);
      return value;
    } catch {
      console.warn(`[IDataService] Corrupt value for key ${id}, clearing`);
      localStorage.removeItem(key);
      return undefined;
    }
  }

  private docPrefix(collectionName: string, isPrivate?: boolean): string {
    const scope = isPrivate ? 'user' : 'account';
    return `data:doc:${scope}:${collectionName}:`;
  }

  private docKey(collectionName: string, id: string, isPrivate?: boolean): string {
    return `${this.docPrefix(collectionName, isPrivate)}${id}`;
  }

  private kvKey(id: string, isPrivate?: boolean): string {
    const scope = isPrivate ? 'user' : 'account';
    return `data:kv:${scope}:${id}`;
  }

  private debugLog(message: string, ...args: unknown[]): void {
    if (environment.debug) {
      console.log(`[IDataService] ${message}`, ...args);
    }
  }
}