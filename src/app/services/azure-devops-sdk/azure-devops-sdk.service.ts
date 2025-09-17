import { Injectable, signal } from '@angular/core';

type AzureSDK = typeof import('azure-devops-extension-sdk');

declare global {
  interface Window {
    require: any;
    requirejs: any;
    define: any;
  }
}

@Injectable({ providedIn: 'root' })
export class AzureDevOpsSdkService {
  sdk = signal<AzureSDK | null>(null);

  public async initialize(): Promise<void> {
    console.debug('[SdkService] init called');

    if (this.sdk() != null) {
      console.debug('[SdkService] SDK already initialized, skipping');
      return;
    }

    if (!window.require || !window.define) {
      const ok = await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js');
      if (!ok) {
        console.warn('[SdkService] Failed to load RequireJS');
        return;
      }
      console.debug('[SdkService] RequireJS loaded');
    }

    window.requirejs.config({
      enforceDefine: true,
      baseUrl: './',
      paths: {
        SDK: 'lib/SDK.min'
      }
    });

    console.debug('[SdkService] Requiring SDK via AMD');
    const sdk = await new Promise<AzureSDK | null>((resolve) => {
      try {
        window.require(['SDK'], (loaded: AzureSDK) => {
          if (!loaded) {
            console.warn('[SdkService] SDK module resolved empty');
            resolve(null);
            return;
          }
          console.debug('[SdkService] SDK AMD module loaded');
          resolve(loaded);
        }, (err: unknown) => {
          console.warn('[SdkService] AMD require failed', err);
          resolve(null);
        });
      } catch (e) {
        console.warn('[SdkService] Exception during require', e);
        resolve(null);
      }
    });

    if (!sdk) {
      console.warn('[SdkService] SDK script could not be loaded');
      return;
    }

    console.debug('[SdkService] Initializing SDK');
    sdk.init();
    console.debug('[SdkService] Waiting for sdk.ready');
    await sdk.ready();

    this.sdk.set(sdk);
    console.debug('[SdkService] SDK ready, signal set');
  }

  private loadScript(src: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        console.debug(`[SdkService] Script already present, ${src}`);
        resolve(true);
        return;
      }
      const el = document.createElement('script');
      el.src = src;
      el.async = true;
      el.onload = () => {
        console.debug(`[SdkService] Script loaded, ${src}`);
        resolve(true);
      };
      el.onerror = (err) => {
        console.warn(`[SdkService] Script failed, ${src}`, err);
        resolve(false);
      };
      document.head.appendChild(el);
    });
  }
}