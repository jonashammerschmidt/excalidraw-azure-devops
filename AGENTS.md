# AGENTS.md

## Zweck
Diese Datei ist die Arbeitsanweisung für Coding-Agents in diesem Repository (`excalidraw-azure-devops`).
Ziel ist es, Änderungen konsistent, sicher und release-fähig umzusetzen.

## Projektkontext
- Angular 20 Standalone App als Azure DevOps Extension Hub.
- Excalidraw wird über React-in-Web-Component eingebettet.
- Persistenz läuft über ein `IDataService`-Abstraktionslayer:
  - Produktion: `AzureDevOpsExtensionDataService`
  - Entwicklung: `DataLocalStorageService`

## Wichtige Dateien
- `/Users/jonas/dev/excalidraw-azure-devops/src/app/app.config.ts`:
  entscheidet, welches Data-Service-Backend genutzt wird.
- `/Users/jonas/dev/excalidraw-azure-devops/src/app/model/excalidraw-scenes/excalidraw-scenes.service.ts`:
  zentrale Logik für Laden/Speichern/Löschen von Zeichnungen.
- `/Users/jonas/dev/excalidraw-azure-devops/src/app/pages/drawing/drawing.page.ts`:
  Editor-Seite inkl. Autosave, Debounce, Konfliktbehandlung.
- `/Users/jonas/dev/excalidraw-azure-devops/src/app/pages/drawings/drawings.page.ts`:
  Listenansicht (anlegen, umbenennen, löschen).
- `/Users/jonas/dev/excalidraw-azure-devops/vss-extension.json`:
  Azure DevOps Extension Manifest (Contributions, package files).

## Arbeitsregeln für Änderungen
- Halte `IDataService`-Verträge strikt stabil.
- Wenn `IDataService` geändert wird, müssen beide Implementierungen angepasst werden:
  - `/Users/jonas/dev/excalidraw-azure-devops/src/app/services/data/azure-devops-extension.data.service.ts`
  - `/Users/jonas/dev/excalidraw-azure-devops/src/app/services/data/local-storage.data.service.ts`
- `__etag`/Versionslogik nicht umgehen. Konflikte müssen weiter über `VersionMismatchError` laufen.
- Projekt-Scope beachten: Szenen dürfen nur für das aktuelle Projekt sichtbar/veränderbar sein.
- Bestehendes UI/UX-Verhalten erhalten:
  - Autosave bleibt Debounce-basiert.
  - Bei Konflikt bleibt Reload-Action verfügbar.

## Code-Stil
- TypeScript mit klaren, kleinen Funktionen; keine unnötige Komplexität.
- Bestehende Angular-Signal-Patterns (`signal`, `resource`, `effect`) fortführen.
- Bestehende Namensgebung und Datei-Struktur beibehalten.
- Keine großen Refactorings ohne klaren funktionalen Bedarf.

## Lokale Befehle
- Entwicklung starten: `npm run start`
- Production-Build: `npm run build`
- Tests: `npm run test`

## Validierung vor Abschluss
- Bei jeder funktionalen Änderung mindestens `npm run build` ausführen.
- `npm run test` ausführen, wenn Logik, State-Handling oder Datenzugriff geändert wurde.
- Bei UI-Änderungen manuell prüfen:
  - Zeichnung anlegen, öffnen, Autosave auslösen.
  - Umbenennen und löschen.
  - Query-Param-Navigation (`drawingId`) funktioniert.

## Extension/Release-Hinweise
- Manifest-Änderungen in `/Users/jonas/dev/excalidraw-azure-devops/vss-extension.json` konsistent halten.
- Build-Output-Pfad im Manifest (`dist/excalidraw-azure-devops/browser`) darf nicht brechen.
- Native Dialog-Asset unter `/Users/jonas/dev/excalidraw-azure-devops/src/native` beachten.

## Nicht-Ziele
- Keine Annahme von Live-Realtime-Kollaboration.
- Keine Einführung neuer Infrastruktur- oder Backend-Abhängigkeiten ohne explizite Anforderung.
