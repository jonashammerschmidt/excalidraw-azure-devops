import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

const DEBUG_LOGGING_MESSAGE_TYPE = 'excalidraw-azure-devops:set-debug-logging';

type DebugLoggingMessage = {
  type: typeof DEBUG_LOGGING_MESSAGE_TYPE;
  enabled: boolean;
};

declare global {
  interface Window {
    setExcalidrawDebugLogging?: (enabled?: boolean) => boolean;
    excalidrawDebugLog?: (scope: string, message: string, payload?: unknown) => void;
  }
}

@Injectable({ providedIn: 'root' })
export class LoggingService {
  private readonly enabled = signal(environment.debug);
  private initialized = false;

  public initialize(): void {
    if (this.initialized) return;

    window.setExcalidrawDebugLogging = (enabled = true) => {
      this.setEnabled(enabled);
      return this.isEnabled();
    };

    window.excalidrawDebugLog = (scope: string, message: string, payload?: unknown) => {
      this.debug(scope, message, payload);
    };

    window.addEventListener('message', this.handleWindowMessage);
    this.initialized = true;
  }

  public isEnabled(): boolean {
    return this.enabled();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled.set(enabled);
    console.info(`[LoggingService] Debug logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  public debug(scope: string, message: string, payload?: unknown): void {
    if (!this.isEnabled()) return;
    console.log(`[${scope}] ${message}`, payload ?? '');
  }

  private readonly handleWindowMessage = (event: MessageEvent<unknown>): void => {
    const data = event.data;
    if (!this.isDebugLoggingMessage(data)) return;
    this.setEnabled(data.enabled);
  };

  private isDebugLoggingMessage(data: unknown): data is DebugLoggingMessage {
    return typeof data === 'object'
      && data !== null
      && 'type' in data
      && 'enabled' in data
      && (data as { type: unknown }).type === DEBUG_LOGGING_MESSAGE_TYPE
      && typeof (data as { enabled: unknown }).enabled === 'boolean';
  }
}
