import { Component, effect, inject, Injector, input, output, runInInjectionContext, Signal, signal, untracked, WritableSignal } from '@angular/core';
import { ExcalidrawScenesService } from '../../model/excalidraw-scenes/excalidraw-scenes.service';
import { ExcalidrawElementState } from './helper/excalidraw-element-state';
import { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { ExcalidrawAdapterComponent } from '../../components/excalidraw-adapter/excalidraw-adapter.component';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-drawing',
  imports: [ExcalidrawAdapterComponent],
  templateUrl: './drawing.page.html',
  styleUrl: './drawing.page.scss'
})
export class DrawingPage {

  extensionDataService = inject(ExcalidrawScenesService);
  injector = inject(Injector);

  drawingId = input.required<string>();
  close = output<void>();

  elements: WritableSignal<OrderedExcalidrawElement[]> | undefined;
  name = signal("loading...");
  etag = signal(0);

  constructor() {
    effect(() => {
      const drawingId = this.drawingId();
      untracked(() => {
        void this.initializeDrawing(drawingId);
      });
    });
  }

  private async initializeDrawing(drawingId: string) {
    this.elements = undefined;

    const scene = await this.extensionDataService.loadScene(drawingId);
    this.name.set(scene?.name ?? "nameless");
    this.etag.set(scene?.__etag ?? 0);

    runInInjectionContext(this.injector, () => this.elements = signal(scene?.elements ?? []));
  }

  save(): void {
    if (!this.elements) {
      return;
    }

    this.extensionDataService.saveScene({
      id: this.drawingId(),
      name: this.name(),
      elements: this.elements(),
      __etag: this.etag(),
    });

    this.etag.update(etag => etag + 1);
  }
}
