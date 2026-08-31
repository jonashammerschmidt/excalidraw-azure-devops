# Purpose

This repository contains an Angular 20 Azure DevOps Extension Hub for creating
and managing Excalidraw drawings. Excalidraw is embedded through a React web
component; drawings are persisted through an `IDataService` abstraction.

The goal is to keep the editor experience, project-scoped persistence, and
Azure DevOps extension packaging reliable while making focused, maintainable
changes.

## Working Model

Follow these principles for every task:

- Understand the relevant source files before changing them.
- Prefer minimal, focused edits over large refactorings.
- Reuse established patterns and keep names and file structure consistent.
- Validate changes with the project's standard commands.
- Assume the application is already served; never start a development server.
- Do not introduce new infrastructure, dependencies, or real-time
  collaboration without an explicit requirement.
- After implementing a feature, provide exactly one suggested Conventional Commit message as the final piece of information in the result. Derive it solely from the implementation conversation and work performed in the current run; do not inspect staged changes, invoke a skill or script, or gather additional information for this purpose.

## Project Structure

Application source: `src/app`

Pages: `src/app/pages`

Reusable Angular and React adapter components: `src/app/components`

Domain logic and scene persistence: `src/app/model/excalidraw-scenes`

Technical and Azure DevOps services: `src/app/services`

Native dialog assets: `src/native`

Azure DevOps extension manifest: `vss-extension.json`

Area rules: `.codex/rules`

## Area Rules

- Read `.codex/rules/frontend.md` for Angular, TypeScript, HTML, SCSS, or React
  adapter changes under `src/`.
- Read `.codex/rules/persistence.md` for changes to scenes, `IDataService`,
  either data-service implementation, or project scoping.
- Read `.codex/rules/tests.md` when creating or changing tests.
- Read `.codex/rules/extension.md` for `vss-extension.json` or `src/native/`
  changes.

Do not read area rule files unless you are working in that area.

## Canonical Commands

Always use these commands from the repository root; do not substitute
alternatives.

- Production build: `npm run build`
- Unit tests: `npm run test`

Run `npm run build` for every functional change. Run `npm run test` when
changing logic, state handling, persistence, or tests. For UI changes, also
manually verify creating, opening, autosaving, renaming, and deleting a
drawing, as well as `drawingId` query-param navigation.
