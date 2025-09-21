import { inject, Injectable, signal } from '@angular/core';
import type { IExtensionDataManager, IExtensionDataService } from "azure-devops-extension-api";
import { AzureDevOpsSdkService } from '../azure-devops-sdk/azure-devops-sdk.service';
import { IDataService, VersionMismatchError } from './interfaces/i-data.service';

const EXTENSION_DATA_SERVICE_ID = "ms.vss-features.extension-data-service";

@Injectable({ providedIn: 'root' })
export class AzureDevOpsExtensionDataService implements IDataService {

    public sdkService = inject(AzureDevOpsSdkService);
    extensionDataManager: IExtensionDataManager | null = null;

    public async initialize(): Promise<void> {
        if (this.extensionDataManager) {
            console.warn("[IDataService] Data service already initialized");
            return;
        }

        await this.sdkService.initialize();
        const sdk = this.sdkService.sdk();
        if (!sdk) {
            console.warn("[IDataService] Failed to initialize data service: SDK not provided");
            return;
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
            data = await this.extensionDataManager!.getDocuments(collectionName, isPrivate ? { scopeType: "User" } : undefined);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            // Check for specific exception type
            if (e.serverError?.typeKey === "DocumentCollectionDoesNotExistException") {
                console.warn(`[IDataService] Collection ${collectionName} does not exist or contains no documents.`); // expect no documents for new collections
                console.log(`[IDataService] Collection ${collectionName} is missing or empty.`, {
                    properties: { collectionName },
                });
                if (throwCollectionDoesNotExistException) {
                    throw e;
                }
                return [];
            }

            console.error("[IDataService] ", e);
            data = [];
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
            data = await this.extensionDataManager!.getDocument(collectionName, id, isPrivate ? { scopeType: "User" } : undefined);
        } catch (e) {
            console.error("[IDataService] ", e, { collectionName, id });
            data = undefined;
        }

        return data;
    }

    /**
     * Create user/account scoped document.
     */
    public async createDocument<T>(collectionName: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
        return await this.extensionDataManager!.createDocument(collectionName, data, isPrivate ? { scopeType: "User" } : undefined);
    }

    /**
     * Create or Update user/account scoped document.
     */
    public async createOrUpdateDocument<T>(collectionName: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
        try {
            return await this.extensionDataManager!.setDocument(
                collectionName,
                data,
                isPrivate ? { scopeType: "User" } : undefined
            );
        } catch (e: unknown) {
            if (this.isVersionMismatch(e)) {
                throw new VersionMismatchError();
            }
            console.error("[IDataService] ", e);
            return undefined;
        }
    }

    /**
     * Update user/account scoped document.
     */
    public async updateDocument<T>(collectionName: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
        try {
            return await this.extensionDataManager!!.updateDocument(
                collectionName,
                data,
                isPrivate ? { scopeType: "User" } : undefined
            );
        } catch (e: unknown) {
            if (this.isVersionMismatch(e)) {
                throw new VersionMismatchError();
            }
            console.error("[IDataService] ", e);
            return undefined;
        }
    }

    /**
     * Delete user/account scoped document.
     */
    public async deleteDocument(collectionName: string, id: string, isPrivate?: boolean): Promise<void> {
        return await this.extensionDataManager!.deleteDocument(collectionName, id, isPrivate ? { scopeType: "User" } : undefined);
    }

    /**
     * Set user/account scoped value.
     */
    public async setValue<T>(id: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
        let updatedData: T | undefined;
        try {
            return await this.extensionDataManager!.setValue(id, data, isPrivate ? { scopeType: "User" } : undefined);
        } catch (e) {
            console.error("[IDataService] ", e);
            updatedData = undefined;
        }

        return updatedData;
    }

    /**
     * Get user/account scoped value.
     */
    public async getValue<T>(id: string, isPrivate?: boolean): Promise<T | undefined> {
        let data: T | undefined;
        try {
            data = await this.extensionDataManager!.getValue<T>(id, isPrivate ? { scopeType: "User" } : undefined);
        } catch (e) {
            console.error("[IDataService] ", e);
            data = undefined;
        }

        return data;
    }

    private isVersionMismatch(e: unknown): boolean {
        if (!e || typeof e !== 'object') return false;
        const err = e as { serverError?: { typeKey?: string }, responseText?: string, message?: string };
        return err.serverError?.typeKey === 'InvalidDocumentVersionException'
            || /InvalidDocumentVersionException/i.test(err.responseText ?? '')
            || /document version does not match/i.test(err.message ?? '');
    };
}