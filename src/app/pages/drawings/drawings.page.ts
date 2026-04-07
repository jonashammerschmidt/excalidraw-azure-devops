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
type DrawingsSortState = {
  column: SortColumn;
  direction: SortDirection;
};

const DEFAULT_SORT_STATE: DrawingsSortState = {
  column: 'updatedAt',
  direction: 'desc',
};

@Component({
  selector: 'app-drawings',
  templateUrl: './drawings.page.html',
  styleUrl: './drawings.page.scss',
  imports: [DatePipe, KebabMenuComponent],
})
export class DrawingsPage {

  extensionDataService = inject(ExcalidrawScenesService);
  dialogService = inject(DialogService);
  private readonly dataService = inject<IDataService>(DATA_SERVICE);
  private readonly projectService = inject(ProjectService);

  drawingIdSelected = output<string>();

  drawings = signal<SceneMeta[]>([]);
  sortState = signal<DrawingsSortState>(DEFAULT_SORT_STATE);
  sortedDrawings = computed(() => this.getSortedDrawings(this.drawings(), this.sortState()));

  async ngOnInit(): Promise<void> {
    await this.loadSortState();
    this.drawings.set(await this.extensionDataService.listScenes());
  }

  async add(): Promise<void> {
    const name = await this.dialogService.promptInput("New drawing", "Drawing name");
    if (!name || name.trim().length === 0) {
      return;
    }

    const drawingId = newGuid();
    await this.extensionDataService.saveScene({
      id: drawingId,
      name: name,
      elements: [],
      __etag: 0,
    });
    this.drawingIdSelected.emit(drawingId);
  }

  async rename(sceneMeta: SceneMeta): Promise<void> {
    const name = await this.dialogService.promptInput("Rename drawing", "New drawing name", sceneMeta.name);
    if (!name || name === sceneMeta.name) {
      return;
    }

    const scene = await this.extensionDataService.loadScene(sceneMeta.id);
    if (!scene) {
      return;
    }

    scene.name = name;

    await this.extensionDataService.saveScene(scene);
    await this.ngOnInit();
    this.dialogService.openToast("Drawing renamed.", 1000);
  }

  async delete(sceneMeta: SceneMeta): Promise<void> {
    const name = await this.dialogService.promptInput(
      "Delete drawing",
      "Enter drawing name \"" + sceneMeta.name + "\" to confirm deletion");
    if (!name || name !== sceneMeta.name) {
      return;
    }

    await this.extensionDataService.deleteScene(sceneMeta.id);
    await this.ngOnInit();
    this.dialogService.openToast("Drawing deleted.", 1000);
  }

  async changeSort(column: SortColumn): Promise<void> {
    const currentSortState = this.sortState();
    const nextSortState = currentSortState.column === column
      ? {
        column,
        direction: currentSortState.direction === 'asc' ? 'desc' : 'asc',
      } satisfies DrawingsSortState
      : {
        column,
        direction: this.getDefaultDirection(column),
      } satisfies DrawingsSortState;

    this.sortState.set(nextSortState);
    await this.dataService.setValue(await this.getSortStorageKey(), nextSortState, true);
  }

  isSortedBy(column: SortColumn): boolean {
    return this.sortState().column === column;
  }

  getSortIndicator(column: SortColumn): string {
    if (!this.isSortedBy(column)) {
      return '';
    }

    return this.sortState().direction === 'asc' ? '▲' : '▼';
  }

  private async loadSortState(): Promise<void> {
    const storedSortState = await this.dataService.getValue<DrawingsSortState>(await this.getSortStorageKey(), true);
    if (!this.isValidSortState(storedSortState)) {
      this.sortState.set(DEFAULT_SORT_STATE);
      return;
    }

    this.sortState.set(storedSortState);
  }

  private async getSortStorageKey(): Promise<string> {
    const projectId = await this.projectService.getCurrectProjectId();
    return `drawings.sort.${projectId}`;
  }

  private getSortedDrawings(drawings: SceneMeta[], sortState: DrawingsSortState): SceneMeta[] {
    return [...drawings].sort((left, right) => this.compareScenes(left, right, sortState));
  }

  private compareScenes(left: SceneMeta, right: SceneMeta, sortState: DrawingsSortState): number {
    const multiplier = sortState.direction === 'asc' ? 1 : -1;

    if (sortState.column === 'name') {
      const result = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
      if (result !== 0) {
        return result * multiplier;
      }

      return this.compareIsoDates(left.updatedAt, right.updatedAt) * -1;
    }

    const result = this.compareIsoDates(left.updatedAt, right.updatedAt);
    if (result !== 0) {
      return result * multiplier;
    }

    return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
  }

  private compareIsoDates(left: string, right: string): number {
    return new Date(left).getTime() - new Date(right).getTime();
  }

  private getDefaultDirection(column: SortColumn): SortDirection {
    return column === 'name' ? 'asc' : 'desc';
  }

  private isValidSortState(value: DrawingsSortState | undefined): value is DrawingsSortState {
    return value !== undefined
      && (value.column === 'name' || value.column === 'updatedAt')
      && (value.direction === 'asc' || value.direction === 'desc');
  }
}
