import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, output, resource, signal, untracked, WritableSignal
} from '@angular/core';
import { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { ExcalidrawAdapterComponent } from '../../components/excalidraw-adapter/excalidraw-adapter.component';
import { ExcalidrawScenesService, getDefaultSceneDocument, SceneDocument, SceneDocumentForUpdate } from '../../model/excalidraw-scenes/excalidraw-scenes.service';
import { DialogService } from '../../services/dialog/dialog.service';
import { debouncedSignal } from '../../helpers/angular/signal.helper';
import { VersionMismatchError } from '../../services/data/interfaces/i-data.service';
import { deepEqual } from '../../helpers/utils/compare.helper';
import { LoggingService } from '../../services/logging/logging.service';

@Component({
  selector: 'app-drawing',
  imports: [ExcalidrawAdapterComponent],
  templateUrl: './drawing.page.html',
  styleUrl: './drawing.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawingPage {
  private readonly excalidrawScenesService = inject(ExcalidrawScenesService);
  private readonly dialogs = inject(DialogService);
  private readonly loggingService = inject(LoggingService);
  private readonly timeFormatter = new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  drawingId = input.required<string>();
  close = output<void>();

  readonly sceneResource = resource<SceneDocument, string>({
    params: () => this.drawingId(),
    loader: async ({ params }) => {
      const scene = await this.excalidrawScenesService.loadScene(params);
      this.noUpdatesAllowed.set(false);
      return scene ?? getDefaultSceneDocument(params);
    },
  });

  readonly elements: WritableSignal<OrderedExcalidrawElement[]> = signal([]);
  elementsDebounced = debouncedSignal(this.elements, 500);

  noUpdatesAllowed = signal(false);
  isSaving = signal(false);
  lastSavedLabel = signal<string | null>(null);

  constructor() {
    const elementsInitEffectRef = effect(() => {
      if (!this.sceneResource.hasValue()) return;
      const s = this.sceneResource.value()!;
      this.elements.set(this.cloneElements(s.elements));
      elementsInitEffectRef.destroy();
    });

    effect(() => {
      const elements = this.elementsDebounced();
      untracked(() => {
        const scene = this.sceneResource.value();
        const persistedElements = this.normalizeElements(scene?.elements);
        const currentElements = this.normalizeElements(elements);
        const hasPendingChanges = this.sceneResource.hasValue()
          && !deepEqual(persistedElements, currentElements);

        this.loggingService.debug('DrawingPage', 'Autosave effect evaluated', {
          drawingId: this.drawingId(),
          hasScene: this.sceneResource.hasValue(),
          isSaving: this.isSaving(),
          noUpdatesAllowed: this.noUpdatesAllowed(),
          persistedElementCount: persistedElements.length,
          currentElementCount: currentElements.length,
          hasPendingChanges,
          sceneEtag: scene?.__etag ?? null,
          persistedSignature: this.getElementsSignature(persistedElements),
          currentSignature: this.getElementsSignature(currentElements),
          sameArrayReference: scene?.elements === elements,
          sharedElementReferenceCount: this.getSharedElementReferenceCount(scene?.elements, elements),
        });

        if (hasPendingChanges) {
          this.loggingService.debug('DrawingPage', 'Autosave requested from debounced effect', {
            drawingId: this.drawingId(),
            sceneEtag: scene?.__etag ?? null,
            currentElementCount: currentElements.length,
          });
          void this.save();
        }
      });
    });
  }

  async save(): Promise<void> {
    const s = this.sceneResource.value();
    if (!s) {
      this.loggingService.debug('DrawingPage', 'Save skipped because scene is not loaded', {
        drawingId: this.drawingId(),
      });
      return;
    }

    if (this.noUpdatesAllowed()) {
      this.loggingService.debug('DrawingPage', 'Save skipped because updates are disabled', {
        drawingId: this.drawingId(),
        sceneEtag: s.__etag,
      });
      return;
    }

    const updated: SceneDocumentForUpdate = {
      id: this.drawingId(),
      name: s.name,
      elements: this.elements(),
      __etag: s.__etag,
    };

    try {
      this.loggingService.debug('DrawingPage', 'Save started', {
        drawingId: updated.id,
        sceneEtag: updated.__etag,
        elementCount: this.normalizeElements(updated.elements).length,
        isSaving: this.isSaving(),
      });
      this.isSaving.set(true);
      const updatedScene = await this.excalidrawScenesService.saveScene(updated);
      this.loggingService.debug('DrawingPage', 'Save finished successfully', {
        drawingId: updatedScene.id,
        previousEtag: updated.__etag,
        nextEtag: updatedScene.__etag,
        savedElementCount: this.normalizeElements(updatedScene.elements).length,
      });
      this.sceneResource.set({
        ...updatedScene,
        elements: this.cloneElements(updatedScene.elements),
      });
      this.lastSavedLabel.set(this.timeFormatter.format(new Date()));
    } catch (error) {
      this.loggingService.debug('DrawingPage', 'Save failed', {
        drawingId: updated.id,
        sceneEtag: updated.__etag,
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof VersionMismatchError) {
        this.dialogs.openToastWithAction(
          'Your changes could not be saved because someone else updated this document. Please reload to get the latest version.',
          15000,
          'Reload',
          () => this.sceneResource.reload(),
        );
        this.noUpdatesAllowed.set(true);
      } else {
        this.dialogs.openToast('An unexpected error occurred. Please reload.', 15000);
        console.error(error);
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  private normalizeElements(elements: OrderedExcalidrawElement[] | undefined): OrderedExcalidrawElement[] {
    return (elements ?? [])
      .filter(e => !e.isDeleted);
  }

  private cloneElements(elements: readonly OrderedExcalidrawElement[]): OrderedExcalidrawElement[] {
    return structuredClone([...elements]) as OrderedExcalidrawElement[];
  }

  private getElementsSignature(elements: readonly OrderedExcalidrawElement[] | undefined): string {
    return JSON.stringify(
      (elements ?? []).map(element => ({
        id: element.id,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        angle: element.angle,
        version: element.version,
        versionNonce: element.versionNonce,
        updated: element.updated,
        isDeleted: element.isDeleted,
      }))
    );
  }

  private getSharedElementReferenceCount(
    persisted: readonly OrderedExcalidrawElement[] | undefined,
    current: readonly OrderedExcalidrawElement[] | undefined,
  ): number {
    if (!persisted?.length || !current?.length) return 0;

    const persistedReferences = new Set(persisted);
    return current.filter(element => persistedReferences.has(element)).length;
  }
}
