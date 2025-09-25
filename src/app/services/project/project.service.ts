import { inject, Injectable } from '@angular/core';
import { AzureDevOpsSdkService } from '../azure-devops-sdk/azure-devops-sdk.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
    azureDevOpsSdkService = inject(AzureDevOpsSdkService);

    public async getCurrectProjectId(): Promise<string> {
        if (!environment.production) {
            return 'MOCK-PROJECT';
        }

        const sdk = this.azureDevOpsSdkService.sdk()!;
        return sdk.getWebContext().project.id;
    }
}