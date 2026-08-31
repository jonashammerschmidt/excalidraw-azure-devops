import { inject, Injectable } from '@angular/core';
import type { IExtensionDataManager, IExtensionDataService } from "azure-devops-extension-api";
import { AzureDevOpsSdkService } from '../azure-devops-sdk/azure-devops-sdk.service';
import { IDataService, VersionMismatchError } from './interfaces/i-data.service';

const EXTENSION_DATA_SERVICE_ID = "ms.vss-features.extension-data-service";

@Injectable({ providedIn: 'root' })
export class AzureDevOpsExtensionDataService implements IDataService {

    public sdkService = inject(AzureDevOpsSdkService);
    extensionDataManager: IExtensionDataManager | null = null;
    private refreshPromise: Promise<void> | null = null;

    public async initialize(): Promise<void> {
        if (this.extensionDataManager) {
            console.warn("[IDataService] Data service already initialized");
            return;
        }

        await this.sdkService.initialize();
        const sdk = this.sdkService.sdk();
        if (!sdk) {
            throw new Error("[IDataService] Failed to initialize data service: SDK not provided");
        }

        // Use the global SDK
        const accessToken = await sdk.getAccessToken();
        const extensionDataService = await sdk.getService<IExtensionDataService>(EXTENSION_DATA_SERVICE_ID);
        this.extensionDataManager = await extensionDataService.getExtensionDataManager(sdk.getExtensionContext().id, accessToken);
    }

    /**
     * Read user/account scoped documents.
     */
    public async readDocuments<T>(
        collectionName: string,
        isPrivate?: boolean,
        throwCollectionDoesNotExistException?: boolean
    ): Promise<T[]> {
        let data: T[];

        try {
            // Attempt to fetch documents
            data = await this.executeWithAuthRetry(manager =>
                manager.getDocuments(collectionName, isPrivate ? { scopeType: "User" } : undefined)
            );
        } catch (e: unknown) {
            // Check for specific exception type
            if (this.hasServerErrorType(e, "DocumentCollectionDoesNotExistException")) {
                console.warn(`[IDataService] Collection ${collectionName} does not exist or contains no documents.`); // expect no documents for new collections
                console.log(`[IDataService] Collection ${collectionName} is missing or empty.`, {
                    properties: { collectionName },
                });
                if (throwCollectionDoesNotExistException) {
                    throw e;
                }
                return [];
            }

            throw e;
        }
        return data;
    }

    /**
     * Read a specific user/account scoped document.
     */
    public async readDocument<T>(collectionName: string, id: string, isPrivate?: boolean): Promise<T | undefined> {
        if (id === "emptyFeedbackItem") {
            return undefined;
        }
        let data: T | undefined;
        try {
            data = await this.executeWithAuthRetry(manager =>
                manager.getDocument(collectionName, id, isPrivate ? { scopeType: "User" } : undefined)
            );
        } catch (e: unknown) {
            if (this.hasServerErrorType(e, "DocumentDoesNotExistException")) {
                return undefined;
            }
            throw e;
        }

        return data;
    }

    /**
     * Create user/account scoped document.
     */
    public async createDocument<T>(collectionName: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
        return await this.executeWithAuthRetry(manager =>
            manager.createDocument(collectionName, data, isPrivate ? { scopeType: "User" } : undefined)
        );
    }

    /**
     * Create or Update user/account scoped document.
     */
    public async createOrUpdateDocument<T>(collectionName: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
        try {
            return await this.executeWithAuthRetry(manager =>
                manager.setDocument(collectionName, data, isPrivate ? { scopeType: "User" } : undefined)
            );
        } catch (e: unknown) {
            if (this.isVersionMismatch(e)) {
                throw new VersionMismatchError();
            }
            throw e;
        }
    }

    /**
     * Update user/account scoped document.
     */
    public async updateDocument<T>(collectionName: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
        try {
            return await this.executeWithAuthRetry(manager =>
                manager.updateDocument(collectionName, data, isPrivate ? { scopeType: "User" } : undefined)
            );
        } catch (e: unknown) {
            if (this.isVersionMismatch(e)) {
                throw new VersionMismatchError();
            }
            throw e;
        }
    }

    /**
     * Delete user/account scoped document.
     */
    public async deleteDocument(collectionName: string, id: string, isPrivate?: boolean): Promise<void> {
        return await this.executeWithAuthRetry(manager =>
            manager.deleteDocument(collectionName, id, isPrivate ? { scopeType: "User" } : undefined)
        );
    }

    /**
     * Set user/account scoped value.
     */
    public async setValue<T>(id: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
        return await this.executeWithAuthRetry(manager =>
            manager.setValue(id, data, isPrivate ? { scopeType: "User" } : undefined)
        );
    }

    /**
     * Get user/account scoped value.
     */
    public async getValue<T>(id: string, isPrivate?: boolean): Promise<T | undefined> {
        return await this.executeWithAuthRetry(manager =>
            manager.getValue<T>(id, isPrivate ? { scopeType: "User" } : undefined)
        );
    }

    private isVersionMismatch(e: unknown): boolean {
        if (!e || typeof e !== 'object') return false;
        const err = e as { serverError?: { typeKey?: string }, responseText?: string, message?: string };
        return err.serverError?.typeKey === 'InvalidDocumentVersionException'
            || /InvalidDocumentVersionException/i.test(err.responseText ?? '')
            || /document version does not match/i.test(err.message ?? '');
    };

    private async executeWithAuthRetry<T>(operation: (manager: IExtensionDataManager) => Promise<T>): Promise<T> {
        if (this.refreshPromise) {
            await this.refreshPromise;
        }
        try {
            return await operation(this.getExtensionDataManager());
        } catch (error: unknown) {
            if (!this.isAuthenticationError(error)) throw error;

            await this.refreshExtensionDataManager();
            return await operation(this.getExtensionDataManager());
        }
    }

    private getExtensionDataManager(): IExtensionDataManager {
        if (!this.extensionDataManager) {
            throw new Error('[IDataService] Data service is not initialized');
        }
        return this.extensionDataManager;
    }

    private async refreshExtensionDataManager(): Promise<void> {
        if (!this.refreshPromise) {
            this.refreshPromise = (async () => {
                this.extensionDataManager = null;
                await this.initialize();
            })().finally(() => {
                this.refreshPromise = null;
            });
        }
        await this.refreshPromise;
    }

    private hasServerErrorType(error: unknown, typeKey: string): boolean {
        if (!error || typeof error !== 'object') return false;
        const candidate = error as { serverError?: { typeKey?: string } };
        return candidate.serverError?.typeKey === typeKey;
    }

    private isAuthenticationError(error: unknown): boolean {
        if (!error || typeof error !== 'object') return false;
        const candidate = error as {
            status?: number;
            statusCode?: number;
            message?: string;
            responseText?: string;
            serverError?: { message?: string; typeKey?: string };
        };
        const status = candidate.status ?? candidate.statusCode;
        if (status === 401 || status === 403) return true;

        const text = [
            candidate.message,
            candidate.responseText,
            candidate.serverError?.message,
            candidate.serverError?.typeKey,
        ].filter((value): value is string => typeof value === 'string').join(' ');

        return /unauthori[sz]ed|forbidden|authentication required|access token.*expired|token.*expired|TF400813/i.test(text);
    }
}
