import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { IExtensionDataManager, IExtensionDataService } from 'azure-devops-extension-api';
import { AzureDevOpsSdkService } from '../azure-devops-sdk/azure-devops-sdk.service';
import { AzureDevOpsExtensionDataService } from './azure-devops-extension.data.service';

describe('AzureDevOpsExtensionDataService', () => {
  let service: AzureDevOpsExtensionDataService;
  let firstManager: jasmine.SpyObj<IExtensionDataManager>;
  let refreshedManager: jasmine.SpyObj<IExtensionDataManager>;
  let getAccessToken: jasmine.Spy;
  let getExtensionDataManager: jasmine.Spy;

  beforeEach(async () => {
    firstManager = jasmine.createSpyObj<IExtensionDataManager>('firstManager', [
      'getDocuments', 'getDocument', 'createDocument', 'setDocument', 'updateDocument',
      'deleteDocument', 'setValue', 'getValue',
    ]);
    refreshedManager = jasmine.createSpyObj<IExtensionDataManager>('refreshedManager', [
      'getDocuments', 'getDocument', 'createDocument', 'setDocument', 'updateDocument',
      'deleteDocument', 'setValue', 'getValue',
    ]);

    getAccessToken = jasmine.createSpy('getAccessToken').and.returnValues(
      Promise.resolve('expired-token'),
      Promise.resolve('refreshed-token'),
    );
    getExtensionDataManager = jasmine.createSpy('getExtensionDataManager').and.returnValues(
      Promise.resolve(firstManager),
      Promise.resolve(refreshedManager),
    );
    const extensionDataService = { getExtensionDataManager } as unknown as IExtensionDataService;
    const sdk = {
      getAccessToken,
      getService: jasmine.createSpy('getService').and.resolveTo(extensionDataService),
      getExtensionContext: () => ({ id: 'publisher.extension' }),
    };
    const sdkService = {
      initialize: jasmine.createSpy('initialize').and.resolveTo(),
      sdk: signal(sdk),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AzureDevOpsExtensionDataService,
        { provide: AzureDevOpsSdkService, useValue: sdkService },
      ],
    });
    service = TestBed.inject(AzureDevOpsExtensionDataService);
    await service.initialize();
  });

  it('refreshes the data manager once and retries after an authentication error', async () => {
    const confirmed = { id: 'drawing-id', __etag: 2 };
    firstManager.setDocument.and.rejectWith({ status: 401, message: 'Unauthorized' });
    refreshedManager.setDocument.and.resolveTo(confirmed);

    const result = await service.createOrUpdateDocument('drawings', { id: 'drawing-id', __etag: 1 });

    expect(result).toEqual(confirmed);
    expect(getAccessToken).toHaveBeenCalledTimes(2);
    expect(getExtensionDataManager).toHaveBeenCalledTimes(2);
    expect(refreshedManager.setDocument).toHaveBeenCalledTimes(1);
  });

  it('propagates a non-authentication write error', async () => {
    const error = new Error('Network unavailable');
    firstManager.setDocument.and.rejectWith(error);

    await expectAsync(
      service.createOrUpdateDocument('drawings', { id: 'drawing-id', __etag: 1 }),
    ).toBeRejectedWith(error);

    expect(getExtensionDataManager).toHaveBeenCalledTimes(1);
  });

  it('only treats a missing document error as an absent document', async () => {
    firstManager.getDocument.and.rejectWith({
      serverError: { typeKey: 'DocumentDoesNotExistException' },
    });

    await expectAsync(service.readDocument('drawings', 'missing')).toBeResolvedTo(undefined);
  });

  it('propagates other document read errors', async () => {
    const error = new Error('Request failed');
    firstManager.getDocument.and.rejectWith(error);

    await expectAsync(service.readDocument('drawings', 'drawing-id')).toBeRejectedWith(error);
  });
});
