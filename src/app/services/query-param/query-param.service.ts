import { inject, Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IHostNavigationService } from 'azure-devops-extension-api';
import { environment } from '../../../environments/environment';
import { AzureDevOpsSdkService } from '../azure-devops-sdk/azure-devops-sdk.service';

@Injectable({ providedIn: 'root' })
export class QueryParamService {
    private readonly azureDevOpsSdkService = inject(AzureDevOpsSdkService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    private _hostNavigationService: IHostNavigationService | undefined;

    public async getParam(key: string): Promise<string | null> {
        if (!environment.production) {
            return this.route.snapshot.queryParamMap.get(key);
        }

        const hostNavigationService = await this.getHostNavigationService();
        const params = await hostNavigationService.getQueryParams();

        return params[key] ?? null;
    }

    public async setParam(key: string, value: string | null): Promise<void> {
        if (!environment.production) {
            const queryParams = { ...this.route.snapshot.queryParams };
            if (value === null) {
                delete queryParams[key];
            } else {
                queryParams[key] = value;
            }

            await this.router.navigate([], {
                relativeTo: this.route,
                queryParams,
                queryParamsHandling: 'replace',
            });
            return;
        }

        const hostNavigationService = await this.getHostNavigationService();
        const params = await hostNavigationService.getQueryParams();
        params[key] = value ?? '';
        await hostNavigationService.setQueryParams(params);
    }

    public async getAllParams(): Promise<Record<string, string>> {
        if (!environment.production) {
            return this.route.snapshot.queryParams;
        }
        const hostNavigationService = await this.getHostNavigationService();
        return await hostNavigationService.getQueryParams();
    }

    private async getHostNavigationService(): Promise<IHostNavigationService> {
        if (!this._hostNavigationService) {
            const sdk = this.azureDevOpsSdkService.sdk()!;
            this._hostNavigationService = await sdk
                .getService<IHostNavigationService>('ms.vss-features.host-navigation-service');
        }

        return this._hostNavigationService;
    }
}