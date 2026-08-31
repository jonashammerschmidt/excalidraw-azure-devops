import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { ExcalidrawScenesService, SceneDocument } from '../../model/excalidraw-scenes/excalidraw-scenes.service';
import { DialogService } from '../../services/dialog/dialog.service';
import { LoggingService } from '../../services/logging/logging.service';
import { DrawingPage } from './drawing.page';

describe('DrawingPage autosave', () => {
  let scenesService: jasmine.SpyObj<ExcalidrawScenesService>;

  beforeEach(() => {
    scenesService = jasmine.createSpyObj<ExcalidrawScenesService>('ExcalidrawScenesService', [
      'loadScene', 'saveScene',
    ]);

    TestBed.configureTestingModule({
      imports: [DrawingPage],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ExcalidrawScenesService, useValue: scenesService },
        {
          provide: DialogService,
          useValue: jasmine.createSpyObj<DialogService>('DialogService', [
            'openToast', 'openToastWithAction',
          ]),
        },
        { provide: LoggingService, useValue: { debug: () => undefined } },
      ],
    });
  });

  it('serializes saves and persists the newest queued elements with the confirmed etag', async () => {
    const initialScene = createScene([], 0);
    const firstElements = [createElement('first')];
    const latestElements = [createElement('latest')];
    let resolveFirstSave!: (scene: SceneDocument) => void;
    const firstSave = new Promise<SceneDocument>(resolve => {
      resolveFirstSave = resolve;
    });
    scenesService.loadScene.and.resolveTo(initialScene);
    scenesService.saveScene.and.returnValues(
      firstSave,
      Promise.resolve(createScene(latestElements, 2)),
    );

    const fixture = TestBed.createComponent(DrawingPage);
    fixture.componentRef.setInput('drawingId', 'drawing-id');
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;

    component.elements.set(firstElements);
    const firstSaveCall = component.save();
    component.elements.set(latestElements);
    const queuedSaveCall = component.save();

    expect(scenesService.saveScene).toHaveBeenCalledTimes(1);

    resolveFirstSave(createScene(firstElements, 1));
    await Promise.all([firstSaveCall, queuedSaveCall]);

    expect(scenesService.saveScene).toHaveBeenCalledTimes(2);
    const queuedUpdate = scenesService.saveScene.calls.argsFor(1)[0];
    expect(queuedUpdate.__etag).toBe(1);
    expect(queuedUpdate.elements).toEqual(latestElements);
    expect(component.sceneResource.value()?.__etag).toBe(2);
  });

  it('keeps failed changes pending and exposes a persistent retry state', async () => {
    const initialScene = createScene([], 0);
    const changedElements = [createElement('changed')];
    scenesService.loadScene.and.resolveTo(initialScene);
    scenesService.saveScene.and.rejectWith(new Error('Session expired'));
    spyOn(console, 'error');

    const fixture = TestBed.createComponent(DrawingPage);
    fixture.componentRef.setInput('drawingId', 'drawing-id');
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.elements.set(changedElements);

    await component.save();

    expect(component.hasPendingChanges()).toBeTrue();
    expect(component.saveErrorMessage()).toContain('Changes not saved');
    expect(component.lastSavedLabel()).toBeNull();
  });

  it('does not autosave an initial empty value over loaded elements', async () => {
    const persistedElements = [createElement('persisted')];
    scenesService.loadScene.and.resolveTo(createScene(persistedElements, 4));

    const fixture = TestBed.createComponent(DrawingPage);
    fixture.componentRef.setInput('drawingId', 'drawing-id');
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 550));

    expect(scenesService.saveScene).not.toHaveBeenCalled();
    expect(fixture.componentInstance.elements()).toEqual(persistedElements);
  });

  it('replaces editor elements after reloading the drawing', async () => {
    const initialElements = [createElement('initial')];
    const reloadedElements = [createElement('reloaded')];
    scenesService.loadScene.and.returnValues(
      Promise.resolve(createScene(initialElements, 1)),
      Promise.resolve(createScene(reloadedElements, 2)),
    );

    const fixture = TestBed.createComponent(DrawingPage);
    fixture.componentRef.setInput('drawingId', 'drawing-id');
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.retryLoad();
    await fixture.whenStable();

    expect(fixture.componentInstance.elements()).toEqual(reloadedElements);
  });
});

function createScene(elements: OrderedExcalidrawElement[], etag: number): SceneDocument {
  return {
    id: 'drawing-id',
    name: 'Drawing',
    updatedAt: '2026-08-31T12:00:00.000Z',
    projectId: 'project-id',
    elements,
    __etag: etag,
  };
}

function createElement(id: string): OrderedExcalidrawElement {
  return {
    id,
    isDeleted: false,
  } as unknown as OrderedExcalidrawElement;
}
