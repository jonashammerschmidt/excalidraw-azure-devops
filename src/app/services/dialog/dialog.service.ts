import { inject, Injectable } from '@angular/core';
import { AzureDevOpsSdkService } from '../azure-devops-sdk/azure-devops-sdk.service';
import { IGlobalMessagesService, IHostPageLayoutService } from 'azure-devops-extension-api';
import { environment } from '../../../environments/environment';

const HOST_PAGE_LAYOUT_SERVICE_ID = "ms.vss-features.host-page-layout-service";
const GLOBAL_MESSAGES_SERVICE_ID = "ms.vss-tfs-web.tfs-global-messages-service";

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

    public async openToast(text: string): Promise<void> {
        if (!environment.production) {
            alert(text);
        }

        const sdk = this.azureDevOpsSdkService.sdk()!;
        const globalMessagesService = await sdk.getService<IGlobalMessagesService>(GLOBAL_MESSAGES_SERVICE_ID);

        globalMessagesService.addToast({
            duration: 1000,
            message: text,
        })
    }
}