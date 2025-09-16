import type * as SDKTypes from "azure-devops-extension-sdk";

declare global {
  interface Window {
    SDK?: typeof SDKTypes;
  }
}
export {};