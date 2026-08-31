import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DATA_SERVICE, IDataService } from '../../services/data/interfaces/i-data.service';
import { LoggingService } from '../../services/logging/logging.service';
import { ProjectService } from '../../services/project/project.service';
import {
  ELEMENTS_COLLECTION,
  ExcalidrawScenesService,
  META_COLLECTION,
  SceneElementsDoc,
  SceneMeta,
} from './excalidraw-scenes.service';

describe('ExcalidrawScenesService', () => {
  let service: ExcalidrawScenesService;
  let dataService: jasmine.SpyObj<IDataService>;

  beforeEach(() => {
    dataService = jasmine.createSpyObj<IDataService>('IDataService', [
      'initialize',
      'readDocuments',
      'readDocument',
      'createDocument',
      'createOrUpdateDocument',
      'updateDocument',
      'deleteDocument',
      'setValue',
      'getValue',
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ExcalidrawScenesService,
        { provide: DATA_SERVICE, useValue: dataService },
        { provide: ProjectService, useValue: { getCurrectProjectId: async () => 'project-id' } },
        { provide: LoggingService, useValue: { debug: () => undefined } },
      ],
    });
    service = TestBed.inject(ExcalidrawScenesService);
  });

  it('rejects a save when the element write has no server confirmation', async () => {
    dataService.createOrUpdateDocument.and.resolveTo(undefined);

    await expectAsync(service.saveScene({
      id: 'drawing-id',
      name: 'Drawing',
      elements: [],
      __etag: 3,
    })).toBeRejectedWithError(/returned no confirmation/);

    expect(dataService.createOrUpdateDocument).toHaveBeenCalledOnceWith(
      ELEMENTS_COLLECTION,
      { id: 'drawing-id', elements: [], __etag: 3 },
    );
  });

  it('rejects a save when the metadata write has no server confirmation', async () => {
    const savedElements: SceneElementsDoc = { id: 'drawing-id', elements: [], __etag: 4 };
    dataService.createOrUpdateDocument.and.returnValues(
      Promise.resolve(savedElements),
      Promise.resolve(undefined),
    );

    await expectAsync(service.saveScene({
      id: 'drawing-id',
      name: 'Drawing',
      elements: [],
      __etag: 3,
    })).toBeRejectedWithError(/returned no confirmation/);

    expect(dataService.createOrUpdateDocument.calls.argsFor(1)[0]).toBe(META_COLLECTION);
  });

  it('returns the server-confirmed metadata and elements', async () => {
    const savedElements: SceneElementsDoc = { id: 'drawing-id', elements: [], __etag: 8 };
    const savedMeta: SceneMeta = {
      id: 'drawing-id',
      name: 'Drawing',
      updatedAt: '2026-08-31T12:00:00.000Z',
      projectId: 'project-id',
      __etag: 7,
    };
    dataService.createOrUpdateDocument.and.returnValues(
      Promise.resolve(savedElements),
      Promise.resolve(savedMeta),
    );

    const result = await service.saveScene({
      id: 'drawing-id',
      name: 'Drawing',
      elements: [],
      __etag: 6,
    });

    expect(result).toEqual({ ...savedMeta, elements: savedElements.elements });
  });
});
