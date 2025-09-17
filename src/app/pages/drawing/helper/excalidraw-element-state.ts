import { signal, WritableSignal } from "@angular/core";
import { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";

export class ExcalidrawElementState {
    elements: WritableSignal<OrderedExcalidrawElement[]>;

    constructor(
        initialElements: OrderedExcalidrawElement[]) {
        this.elements = signal<OrderedExcalidrawElement[]>(initialElements);
    }
}
