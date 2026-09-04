import { inject, Injectable } from '@angular/core';
import { AzureDevOpsSdkService } from '../azure-devops-sdk/azure-devops-sdk.service';
import { IGlobalMessagesService, IHostPageLayoutService } from 'azure-devops-extension-api';
import { environment } from '../../../environments/environment';

const HOST_PAGE_LAYOUT_SERVICE_ID = "ms.vss-features.host-page-layout-service";
const GLOBAL_MESSAGES_SERVICE_ID = "ms.vss-tfs-web.tfs-global-messages-service";

export type DrawingDetails = {
    name: string;
    folderPath: string;
};

export type DrawingDetailsLabels = {
    name: string;
    folderPath: string;
};

const DEFAULT_DRAWING_DETAILS_LABELS: DrawingDetailsLabels = {
    name: 'Drawing name',
    folderPath: 'Folder path (optional)',
};

@Injectable({ providedIn: 'root' })
export class DialogService {
    azureDevOpsSdkService = inject(AzureDevOpsSdkService);

    public async promptInput(title: string, label: string, initialValue?: string): Promise<string | null> {
        if (!environment.production) {
            return prompt(label, initialValue);
        }

        const sdk = this.azureDevOpsSdkService.sdk()!;

        const hostPageLayoutService = await sdk.getService<IHostPageLayoutService>(HOST_PAGE_LAYOUT_SERVICE_ID);
        const extensionCtx = sdk.getExtensionContext();
        const contributionId = `${extensionCtx.publisherId}.${extensionCtx.extensionId}.drawing-name-form`;

        return new Promise((resolve) => {
            hostPageLayoutService.openCustomDialog<string | null>(contributionId, {
                title,
                configuration: {
                    message: label,
                    initialValue: initialValue,
                },
                onClose: (result) => {
                    resolve(result ?? null);
                }
            });
        });
    }

    public async promptDrawingDetails(
        title: string,
        initialValue: DrawingDetails = { name: '', folderPath: '' },
        labels: DrawingDetailsLabels = DEFAULT_DRAWING_DETAILS_LABELS,
    ): Promise<DrawingDetails | null> {
        if (!environment.production) {
            const name = prompt(labels.name, initialValue.name);
            if (name === null) {
                return null;
            }

            const folderPath = prompt(labels.folderPath, initialValue.folderPath);
            return folderPath === null ? null : { name, folderPath };
        }

        const sdk = this.azureDevOpsSdkService.sdk()!;
        const hostPageLayoutService = await sdk.getService<IHostPageLayoutService>(HOST_PAGE_LAYOUT_SERVICE_ID);
        const extensionCtx = sdk.getExtensionContext();
        const contributionId = `${extensionCtx.publisherId}.${extensionCtx.extensionId}.drawing-name-form`;

        return new Promise((resolve) => {
            hostPageLayoutService.openCustomDialog<DrawingDetails | null>(contributionId, {
                title,
                configuration: { initialValue, labels },
                onClose: (result) => resolve(result ?? null),
            });
        });
    }

    public async openToast(text: string, duration: number): Promise<void> {
        if (!environment.production) {
            alert(text);
            return;
        }

        const sdk = this.azureDevOpsSdkService.sdk()!;
        const globalMessagesService = await sdk.getService<IGlobalMessagesService>(GLOBAL_MESSAGES_SERVICE_ID);

        globalMessagesService.addToast({
            duration,
            message: text,
        });
    }

    public async openToastWithAction(
        text: string,
        duration: number,
        action: string,
        onActionClick: () => void,
        replacementToast?: { text: string; duration: number },
    ): Promise<void> {
        if (!environment.production) {
            if (confirm(text)) {
                onActionClick();
            }
            return;
        }

        const sdk = this.azureDevOpsSdkService.sdk()!;
        const globalMessagesService = await sdk.getService<IGlobalMessagesService>(GLOBAL_MESSAGES_SERVICE_ID);

        globalMessagesService.addToast({
            duration,
            message: text,
            callToAction: action,
            onCallToActionClick: () => {
                // The Azure DevOps API does not expose a way to dismiss a toast.
                // Replace the active toast with an optional follow-up toast instead.
                globalMessagesService.addToast({
                    duration: replacementToast?.duration ?? 1,
                    message: replacementToast?.text ?? '',
                    forceOverrideExisting: true,
                });
                onActionClick();
            },
        });
    }
}
