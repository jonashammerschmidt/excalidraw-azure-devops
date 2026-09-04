import { Component, computed, inject, output, signal } from '@angular/core';
import { ExcalidrawScenesService, SceneMeta } from '../../model/excalidraw-scenes/excalidraw-scenes.service';
import { newGuid } from '../../helpers/utils/guid.helper';
import { DatePipe } from '@angular/common';
import { DialogService } from '../../services/dialog/dialog.service';
import { KebabMenuComponent } from '../../components/kebab-menu/kebab-menu.component';
import { DATA_SERVICE, IDataService } from '../../services/data/interfaces/i-data.service';
import { ProjectService } from '../../services/project/project.service';

type SortColumn = 'name' | 'updatedAt';
type SortDirection = 'asc' | 'desc';
export type DrawingsSortState = { column: SortColumn; direction: SortDirection };

export type DrawingFolder = {
  name: string;
  path: string;
  folders: DrawingFolder[];
  drawings: SceneMeta[];
};

export type DrawingTreeEntry =
  | { kind: 'folder'; folder: DrawingFolder; depth: number }
  | { kind: 'drawing'; drawing: SceneMeta; depth: number };

const DEFAULT_SORT_STATE: DrawingsSortState = { column: 'updatedAt', direction: 'desc' };

export function normalizeFolderPath(folderPath: string | undefined): string | undefined {
  const normalized = (folderPath ?? '').split('/').map(segment => segment.trim()).filter(Boolean).join('/');
  return normalized || undefined;
}

export function moveFolderPath(sourcePath: string, targetPath: string, folderPath: string | undefined): string | undefined {
  const normalizedFolderPath = normalizeFolderPath(folderPath);
  if (!normalizedFolderPath || (normalizedFolderPath !== sourcePath && !normalizedFolderPath.startsWith(`${sourcePath}/`))) {
    return normalizedFolderPath;
  }
  return `${targetPath}${normalizedFolderPath.slice(sourcePath.length)}`;
}

export function createDrawingTree(drawings: readonly SceneMeta[]): DrawingFolder {
  const root: DrawingFolder = { name: '', path: '', folders: [], drawings: [] };

  for (const drawing of drawings) {
    let current = root;
    const folderPath = normalizeFolderPath(drawing.folderPath);
    for (const segment of folderPath?.split('/') ?? []) {
      const path = current.path ? `${current.path}/${segment}` : segment;
      let folder = current.folders.find(candidate => candidate.name === segment);
      if (!folder) {
        folder = { name: segment, path, folders: [], drawings: [] };
        current.folders.push(folder);
      }
      current = folder;
    }
    current.drawings.push(drawing);
  }
  return root;
}

export function flattenDrawingTree(
  root: DrawingFolder,
  expandedFolderPaths: ReadonlySet<string>,
  sortState: DrawingsSortState,
): DrawingTreeEntry[] {
  const entries: DrawingTreeEntry[] = [];
  const appendEntries = (folder: DrawingFolder, depth: number): void => {
    for (const childFolder of [...folder.folders].sort((left, right) => compareNames(left.name, right.name))) {
      entries.push({ kind: 'folder', folder: childFolder, depth });
      if (expandedFolderPaths.has(childFolder.path)) appendEntries(childFolder, depth + 1);
    }
    for (const drawing of [...folder.drawings].sort((left, right) => compareScenes(left, right, sortState))) {
      entries.push({ kind: 'drawing', drawing, depth });
    }
  };
  appendEntries(root, 0);
  return entries;
}

function compareScenes(left: SceneMeta, right: SceneMeta, sortState: DrawingsSortState): number {
  const multiplier = sortState.direction === 'asc' ? 1 : -1;
  if (sortState.column === 'name') {
    const result = compareNames(left.name, right.name);
    return result !== 0 ? result * multiplier : compareIsoDates(left.updatedAt, right.updatedAt) * -1;
  }
  const result = compareIsoDates(left.updatedAt, right.updatedAt);
  return result !== 0 ? result * multiplier : compareNames(left.name, right.name);
}

function compareNames(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

function compareIsoDates(left: string, right: string): number {
  return new Date(left).getTime() - new Date(right).getTime();
}

@Component({
  selector: 'app-drawings',
  templateUrl: './drawings.page.html',
  styleUrl: './drawings.page.scss',
  imports: [DatePipe, KebabMenuComponent],
})
export class DrawingsPage {
  private readonly extensionDataService = inject(ExcalidrawScenesService);
  private readonly dialogService = inject(DialogService);
  private readonly dataService = inject<IDataService>(DATA_SERVICE);
  private readonly projectService = inject(ProjectService);

  readonly drawingIdSelected = output<string>();
  readonly drawings = signal<SceneMeta[]>([]);
  readonly loadErrorMessage = signal<string | null>(null);
  readonly sortState = signal<DrawingsSortState>(DEFAULT_SORT_STATE);
  readonly expandedFolderPaths = signal<ReadonlySet<string>>(new Set());
  readonly drawingTree = computed(() => createDrawingTree(this.drawings()));
  readonly visibleEntries = computed(() => flattenDrawingTree(
    this.drawingTree(), this.expandedFolderPaths(), this.sortState(),
  ));

  async ngOnInit(): Promise<void> {
    try {
      await this.loadSortState();
      this.drawings.set(await this.extensionDataService.listScenes());
      this.loadErrorMessage.set(null);
    } catch (error: unknown) {
      this.loadErrorMessage.set('Drawings could not be loaded. Check your Azure DevOps session or network connection.');
      console.error(error);
    }
  }

  async add(): Promise<void> {
    const details = await this.dialogService.promptDrawingDetails('New drawing');
    await this.createDrawing(details);
  }

  async addInFolder(folder: DrawingFolder): Promise<void> {
    const details = await this.dialogService.promptDrawingDetails('New drawing', { name: '', folderPath: folder.path });
    await this.createDrawing(details);
  }

  async renameFolder(folder: DrawingFolder): Promise<void> {
    const parentPath = folder.path.includes('/') ? folder.path.slice(0, folder.path.lastIndexOf('/')) : '';
    const details = await this.dialogService.promptDrawingDetails('Rename/move folder', {
      name: folder.name, folderPath: parentPath,
    }, {
      name: 'Folder name', folderPath: 'Parent folder (optional)',
    });
    const name = details?.name.trim();
    if (!details || !name) return;
    const targetPath = [normalizeFolderPath(details.folderPath), name].filter(Boolean).join('/');
    if (targetPath === folder.path) return;
    if (targetPath.startsWith(`${folder.path}/`)) {
      await this.dialogService.openToast('A folder cannot be moved into itself.', 5000);
      return;
    }
    try {
      const affectedDrawings = this.drawings().filter(({ folderPath }) => {
        const normalizedFolderPath = normalizeFolderPath(folderPath);
        return normalizedFolderPath === folder.path || normalizedFolderPath?.startsWith(`${folder.path}/`);
      });
      for (const drawing of affectedDrawings) {
        const scene = await this.extensionDataService.loadScene(drawing.id);
        if (!scene) continue;
        scene.folderPath = moveFolderPath(folder.path, targetPath, scene.folderPath);
        await this.extensionDataService.saveScene(scene);
      }
      await this.ngOnInit();
      await this.dialogService.openToast('Folder renamed/moved.', 1000);
    } catch (error: unknown) {
      this.showOperationError('Folder could not be renamed or moved.', error);
    }
  }

  async rename(sceneMeta: SceneMeta): Promise<void> {
    const details = await this.dialogService.promptDrawingDetails('Rename/move drawing', {
      name: sceneMeta.name, folderPath: sceneMeta.folderPath ?? '',
    });
    const name = details?.name.trim();
    if (!details || !name) return;
    const folderPath = normalizeFolderPath(details.folderPath);
    if (name === sceneMeta.name && folderPath === normalizeFolderPath(sceneMeta.folderPath)) return;
    try {
      const scene = await this.extensionDataService.loadScene(sceneMeta.id);
      if (!scene) return;
      scene.name = name;
      scene.folderPath = folderPath;
      await this.extensionDataService.saveScene(scene);
      await this.ngOnInit();
      await this.dialogService.openToast('Drawing renamed/moved.', 1000);
    } catch (error: unknown) {
      this.showOperationError('Drawing could not be renamed or moved.', error);
    }
  }

  async delete(sceneMeta: SceneMeta): Promise<void> {
    const name = await this.dialogService.promptInput(
      'Delete drawing', `Enter drawing name "${sceneMeta.name}" to confirm deletion`,
    );
    if (!name || name !== sceneMeta.name) return;
    try {
      await this.extensionDataService.deleteScene(sceneMeta.id);
      await this.ngOnInit();
      await this.dialogService.openToast('Drawing deleted.', 1000);
    } catch (error: unknown) {
      this.showOperationError('Drawing could not be deleted.', error);
    }
  }

  toggleFolder(path: string): void {
    this.expandedFolderPaths.update(paths => {
      const updated = new Set(paths);
      updated.has(path) ? updated.delete(path) : updated.add(path);
      return updated;
    });
  }

  isFolderExpanded(path: string): boolean {
    return this.expandedFolderPaths().has(path);
  }

  async changeSort(column: SortColumn): Promise<void> {
    const currentSortState = this.sortState();
    const nextSortState: DrawingsSortState = currentSortState.column === column
      ? { column, direction: currentSortState.direction === 'asc' ? 'desc' : 'asc' }
      : { column, direction: this.getDefaultDirection(column) };
    this.sortState.set(nextSortState);
    try {
      await this.dataService.setValue(await this.getSortStorageKey(), nextSortState, true);
    } catch (error: unknown) {
      this.showOperationError('Sort order could not be saved.', error);
    }
  }

  isSortedBy(column: SortColumn): boolean { return this.sortState().column === column; }

  getSortIndicator(column: SortColumn): string {
    return this.isSortedBy(column) ? (this.sortState().direction === 'asc' ? '▲' : '▼') : '';
  }

  private async loadSortState(): Promise<void> {
    const storedSortState = await this.dataService.getValue<DrawingsSortState>(await this.getSortStorageKey(), true);
    this.sortState.set(this.isValidSortState(storedSortState) ? storedSortState : DEFAULT_SORT_STATE);
  }

  private async createDrawing(details: { name: string; folderPath: string } | null): Promise<void> {
    const name = details?.name.trim();
    if (!details || !name) return;
    const drawingId = newGuid();
    try {
      await this.extensionDataService.saveScene({
        id: drawingId, name, folderPath: normalizeFolderPath(details.folderPath), elements: [], __etag: 0,
      });
      this.drawingIdSelected.emit(drawingId);
    } catch (error: unknown) {
      this.showOperationError('Drawing could not be created.', error);
    }
  }

  private async getSortStorageKey(): Promise<string> {
    return `drawings.sort.${await this.projectService.getCurrectProjectId()}`;
  }

  private getDefaultDirection(column: SortColumn): SortDirection { return column === 'name' ? 'asc' : 'desc'; }

  private isValidSortState(value: DrawingsSortState | undefined): value is DrawingsSortState {
    return value !== undefined && (value.column === 'name' || value.column === 'updatedAt')
      && (value.direction === 'asc' || value.direction === 'desc');
  }

  private showOperationError(message: string, error: unknown): void {
    this.dialogService.openToast(`${message} Check your Azure DevOps session or network connection.`, 15000);
    console.error(error);
  }
}
