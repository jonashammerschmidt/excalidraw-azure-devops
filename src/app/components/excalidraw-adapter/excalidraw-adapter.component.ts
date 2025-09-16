import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, computed, model } from '@angular/core';
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { ExcalidrawState } from './react/excalidraw-react-wc';

@Component({
  selector: 'app-excalidraw-adapter',
  templateUrl: './excalidraw-adapter.component.html',
  styleUrl: './excalidraw-adapter.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ExcalidrawAdapterComponent implements OnInit {

  elements = model.required<OrderedExcalidrawElement[]>();
  initialData = computed<ExcalidrawState>(() => {
    return {
      elements: this.elements(),
      appState: {},
    };
  });

  ngOnInit(): void {
    window.excalidrawChange = (state: ExcalidrawState) => {
      this.elements.set([...state.elements]);
    };
  }
}