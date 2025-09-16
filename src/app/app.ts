import { Component, Injector, OnInit, Signal, WritableSignal, effect, inject, runInInjectionContext, signal } from '@angular/core';
import { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { ExcalidrawAdapterComponent } from './components/excalidraw-adapter/excalidraw-adapter.component';
import { debouncedSignal } from './helpers/angular/signal.helper';
import { DEFAULT_DOC_ID, ExcalidrawScenesService } from './model/excalidraw-scenes/excalidraw-scenes.service';

class ExcalidrawElementState {

  elements: WritableSignal<OrderedExcalidrawElement[]>;
  elementsDebounced: Signal<OrderedExcalidrawElement[]>;

  constructor(
    initialElements: OrderedExcalidrawElement[],
    effectFn: () => void) {
    this.elements = signal<OrderedExcalidrawElement[]>(initialElements);
    this.elementsDebounced = debouncedSignal(this.elements, 500);
    effect(effectFn);
  }
}

@Component({
  selector: 'app-root',
  imports: [ExcalidrawAdapterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  extensionDataService = inject(ExcalidrawScenesService);

  elements = signal<ExcalidrawElementState | undefined>(undefined);

  injector = inject(Injector);

  etag = 0;

  async ngOnInit(): Promise<void> {
    await this.extensionDataService.extensionDataService.initialize();
    const scene = await this.extensionDataService.loadScene(DEFAULT_DOC_ID);
    this.etag = scene?.__etag ?? 0;

    runInInjectionContext(
      this.injector,
      () => {
        this.elements.set(new ExcalidrawElementState(
          scene?.elements ?? [],
          () => {
            this.extensionDataService.saveScene({
              id: DEFAULT_DOC_ID,
              name: 'Default canvas',
              elements: this.elements()!.elementsDebounced(),
              __etag: this.etag++,
            });
          }
        ));
      });
  }

  onExcalidrawChange(elements: OrderedExcalidrawElement[]) {
    this.elements()!.elements.set(elements);
  }
}