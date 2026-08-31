# Azure DevOps extension packaging

This rule applies to `vss-extension.json` and `src/native/`.

- Keep contributions and package-file declarations in `vss-extension.json`
  consistent with the application.
- Do not break the manifest build-output path
  `dist/excalidraw-azure-devops/browser`.
- Preserve the native dialog asset contract in `src/native/` when changing
  dialog-related flows.
