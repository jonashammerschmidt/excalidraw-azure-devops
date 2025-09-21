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

  constructor() {
    const elementsInitEffectRef = effect(() => {
      if (!this.sceneResource.hasValue()) return;
      const s = this.sceneResource.value()!;
      this.elements.set(s.elements);
      elementsInitEffectRef.destroy();
    });

    effect(() => {
      const elements = this.elementsDebounced();
      untracked(() => {
        if (
          this.sceneResource.hasValue() &&
          !deepEqual(
            this.normalizeElements(this.sceneResource.value()?.elements),
            this.normalizeElements(elements))) {
          void this.save();
        }
      });
    });
  }

  async save(): Promise<void> {
    const s = this.sceneResource.value();
    if (!s || this.noUpdatesAllowed()) return;

    const updated: SceneDocumentForUpdate = {
      id: this.drawingId(),
      name: s.name,
      elements: this.elements(),
      __etag: s.__etag,
    };

    try {
      const updatedScene = await this.excalidrawScenesService.saveScene(updated);
      this.sceneResource.set(updatedScene);
    } catch (error) {
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
    }
  }

  private normalizeElements(elements: OrderedExcalidrawElement[]): OrderedExcalidrawElement[] {
    return elements
      .filter(e => !e.isDeleted);
  }
}