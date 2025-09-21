import { Excalidraw } from '@excalidraw/excalidraw';
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  ExcalidrawProps,
} from '@excalidraw/excalidraw/types';
import r2wc from '@r2wc/react-to-web-component';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { resolveThunkOrValue } from '../../../helpers/utils/promise.helper';

declare global {
  interface Window {
    excalidrawChange?: (state: ExcalidrawState) => void;
  }
}

export interface ExcalidrawState {
  elements: readonly OrderedExcalidrawElement[];
  appState: Partial<AppState>;
  files?: BinaryFiles;
}

export function getDefaultAppState(): Partial<AppState> {
  return {
    collaborators: new Map(),
  };
}

function ExcalidrawReactWc(props: ExcalidrawProps) {
  const [initialData, setInitialData] = useState<ExcalidrawInitialDataState | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let canceled = false;

    (async () => {
      const resolved = await resolveThunkOrValue<ExcalidrawInitialDataState>(props.initialData);
      if (canceled) return;

      setInitialData({
        elements: [],
        ...resolved,
        appState: {
          collaborators: new Map(),
        },
      });
    })();

    return () => {
      canceled = true;
    };
  }, [props.initialData]);

  const onKeyDownCapture = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      // keep it inside the component
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent?.stopImmediatePropagation?.();

      // bubble a composed custom event so Angular can hear it on the host element
      rootRef.current?.dispatchEvent(new CustomEvent('ctrlSPressed', {
        bubbles: true,
        composed: true,
      }));
    }
  };

  return (
    <div
      ref={rootRef}
      style={{ width: '100%', height: '100%' }}
      tabIndex={0}
      onKeyDownCapture={onKeyDownCapture}
    >
      {initialData && (
        <Excalidraw
          initialData={initialData}
          excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
            setTimeout(() => {
              if (api.getSceneElements().length > 0) {
                api.scrollToContent(api.getSceneElements(), { fitToContent: true });
              }
            }, 0);
          }}
          onChange={(elements, appState, files) => {
            const state: ExcalidrawState = { elements, appState, files };
            window.excalidrawChange?.(state);
          }}
        />
      )}
    </div>
  );
}

const ExcalidrawReactWcElement = r2wc(ExcalidrawReactWc, {
  props: {
    initialData: 'json',
  },
});

customElements.define('excalidraw-react-wc', ExcalidrawReactWcElement);
