import { InjectionToken } from "@angular/core";

export const DATA_SERVICE = new InjectionToken<IDataService>('DATA_SERVICE');

export interface IDataService {
  initialize(): Promise<void>;

  readDocuments<T>(
    collectionName: string,
    isPrivate?: boolean,
    throwCollectionDoesNotExistException?: boolean
  ): Promise<T[]>;

  readDocument<T>(
    collectionName: string,
    id: string,
    isPrivate?: boolean
  ): Promise<T | undefined>;

  createDocument<T>(
    collectionName: string,
    data: T,
    isPrivate?: boolean
  ): Promise<T | undefined>;

  createOrUpdateDocument<T>(
    collectionName: string,
    data: T,
    isPrivate?: boolean
  ): Promise<T | undefined>;

  updateDocument<T>(
    collectionName: string,
    data: T,
    isPrivate?: boolean
  ): Promise<T | undefined>;

  deleteDocument(
    collectionName: string,
    id: string,
    isPrivate?: boolean
  ): Promise<void>;

  setValue<T>(id: string, data: T, isPrivate?: boolean): Promise<T | undefined>;
  getValue<T>(id: string, isPrivate?: boolean): Promise<T | undefined>;
}