# Scene persistence and project scope

This rule applies to `src/app/model/excalidraw-scenes/`,
`src/app/services/data/`, `src/app/services/project/`, and every change that
reads, writes, or scopes drawings.

## Data-service contract

- Keep the `IDataService` contract stable unless the task explicitly requires a
  contract change.
- If `IDataService` changes, update both implementations together:
  `AzureDevOpsExtensionDataService` and `DataLocalStorageService`.
- Keep `app.config.ts` selecting the intended production and development data
  services.

## Consistency and scope

- Never bypass `__etag` version checks. Surface concurrent-update conflicts as
  `VersionMismatchError`.
- Preserve the drawing page's debounced autosave and its reload action after a
  conflict.
- All scene listing, loading, saving, renaming, and deletion must respect the
  current Azure DevOps project. A drawing from another project must neither be
  visible nor mutable.
- Keep scene metadata and element-document changes consistent, including the
  existing recovery for partial writes.
