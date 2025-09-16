import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { AzureDevOpsExtensionDataService } from './services/data/azure-devops-extension.data.service';
import { DataLocalStorageService } from './services/data/local-storage.data.service';
import { DATA_SERVICE } from './services/data/interfaces/i-data.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    {
      provide: DATA_SERVICE,
      useClass: environment.production
        ? AzureDevOpsExtensionDataService
        : DataLocalStorageService,
    },
  ]
};
