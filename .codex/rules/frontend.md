# Angular frontend and Excalidraw adapter

This rule applies to handwritten application code under `src/`. Read
`persistence.md` as well when a change touches scenes, data access, or project
scope.

## TypeScript and Angular

- Keep TypeScript strict. Avoid `any`; use exact types or `unknown` with
  guards when needed.
- Keep components and services focused on one responsibility.
- Continue the established signal patterns: use `signal` for local state,
  `computed` for derived state, and `input()`/`output()` for bindings.
- Use `inject()` for new dependencies and preserve the surrounding file's
  existing Angular conventions when editing it.
- Keep templates and styles in their existing separate files. Do not add inline
  templates or styles.
- Use Angular control flow (`@if`, `@for`, `@switch`) for new template logic;
  keep template expressions small and accessible.
- Keep static feature routes lazy-loaded when adding a new navigable page.

## Ownership and folders

```text
src/app/
  components/  # reusable UI and the Excalidraw adapter
  model/       # domain-specific scene logic
  pages/       # navigable pages and page-local UI
  services/    # cross-domain and technical concerns
```

- Place an artifact with its closest owner: page-local UI stays with its page,
  domain logic with its model, and technical cross-domain concerns in
  `services/`.
- Do not create global catch-all folders such as `helpers/`, `constants/`, or
  `types/` for a feature-specific concern.
- Use kebab-case for folders and files, and place specs next to their sources.
- Treat `components/excalidraw-adapter/react/` as the boundary to React:
  adapter APIs must remain explicit and typed, without leaking React concerns
  into pages.
