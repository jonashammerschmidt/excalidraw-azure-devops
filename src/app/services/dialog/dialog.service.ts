import { inject, Injectable } from '@angular/core';
import { AzureDevOpsSdkService } from '../azure-devops-sdk/azure-devops-sdk.service';
import { IHostPageLayoutService } from 'azure-devops-extension-api';
import { environment } from '../../../environments/environment';

const HOST_PAGE_LAYOUT_SERVICE_ID = "ms.vss-features.host-page-layout-service";

@Injectable({ providedIn: 'root' })
export class DialogService {
    azureDevOpsSdkService = inject(AzureDevOpsSdkService);

    public async promptForDrawingName(initialDrawingName?: string): Promise<string | null> {
        if (!environment.production) {
            return prompt("Enter drawing name:");
        }

        const sdk = this.azureDevOpsSdkService.sdk()!;

        const hostPageLayoutService = await sdk.getService<IHostPageLayoutService>(HOST_PAGE_LAYOUT_SERVICE_ID);
        const extensionCtx = sdk.getExtensionContext();
        const contributionId = `${extensionCtx.publisherId}.${extensionCtx.extensionId}.drawing-name-form`;

        return new Promise((resolve) => {
            hostPageLayoutService.openCustomDialog<string | null>(contributionId, {
                title: "New drawing",
                configuration: {
                    message: "Drawing name",
                    initialValue: initialDrawingName
                },
                onClose: (result) => {
                    resolve(result ?? null);
                }
            });
        });
    }
}