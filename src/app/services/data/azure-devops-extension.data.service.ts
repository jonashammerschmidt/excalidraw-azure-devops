import { inject, Injectable, signal } from '@angular/core';
import type { IExtensionDataManager, IExtensionDataService } from "azure-devops-extension-api";
import { AzureDevOpsSdkService } from '../azure-devops-sdk/azure-devops-sdk.service';
import { IDataService } from './interfaces/i-data.service';

const EXTENSION_DATA_SERVICE_ID = "ms.vss-features.extension-data-service";

@Injectable({ providedIn: 'root' })
export class AzureDevOpsExtensionDataService implements IDataService {

    public sdkService = inject(AzureDevOpsSdkService);
    extensionDataManager: IExtensionDataManager | null = null;

    public async initialize(): Promise<void> {
        if (this.extensionDataManager) {
            console.warn("Data service already initialized");
            return;
        }

        await this.sdkService.initialize();
        const sdk = this.sdkService.sdk();
        if (!sdk) {
            console.warn("Failed to initialize data service: SDK not provided");
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
                console.warn(`Collection ${collectionName} does not exist or contains no documents.`); // expect no documents for new collections
                console.log(`Collection ${collectionName} is missing or empty.`, {
                    properties: { collectionName },
                });
                if (throwCollectionDoesNotExistException) {
                    throw e;
                }
                return [];
            }

            console.error(e);
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
            console.error(e, { collectionName, id });
            data = undefined;
        }

        return data;
    }

    /**
     * Create user/account scoped document.
     */
    public async createDocument<T>(collectionName: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
        return this.extensionDataManager!.createDocument(collectionName, data, isPrivate ? { scopeType: "User" } : undefined);
    }

    /**
     * Create or Update user/account scoped document.
     */
    public async createOrUpdateDocument<T>(collectionName: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
        return this.extensionDataManager!.setDocument(collectionName, data, isPrivate ? { scopeType: "User" } : undefined);
    }

    /**
     * Update user/account scoped document.
     */
    public async updateDocument<T>(collectionName: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
        let updatedData: T | undefined;
        try {
            updatedData = await this.extensionDataManager!!.updateDocument(collectionName, data, isPrivate ? { scopeType: "User" } : undefined);
        } catch (e) {
            console.error(e);
            updatedData = undefined;
        }

        return updatedData;
    }

    /**
     * Delete user/account scoped document.
     */
    public async deleteDocument(collectionName: string, id: string, isPrivate?: boolean): Promise<void> {
        return this.extensionDataManager!.deleteDocument(collectionName, id, isPrivate ? { scopeType: "User" } : undefined);
    }

    /**
     * Set user/account scoped value.
     */
    public async setValue<T>(id: string, data: T, isPrivate?: boolean): Promise<T | undefined> {
        let updatedData: T | undefined;
        try {
            return this.extensionDataManager!.setValue(id, data, isPrivate ? { scopeType: "User" } : undefined);
        } catch (e) {
            console.error(e);
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
            console.error(e);
            data = undefined;
        }

        return data;
    }


}