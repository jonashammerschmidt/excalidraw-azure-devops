import { Component, inject, output, signal } from '@angular/core';
import { ExcalidrawScenesService, SceneMeta } from '../../model/excalidraw-scenes/excalidraw-scenes.service';
import { newGuid } from '../../helpers/utils/guid.helper';
import { DatePipe } from '@angular/common';
import { DialogService } from '../../services/dialog/dialog.service';
import { KebabMenuComponent } from '../../components/kebab-menu/kebab-menu.component';

@Component({
  selector: 'app-drawings',
  templateUrl: './drawings.page.html',
  styleUrl: './drawings.page.scss',
  imports: [DatePipe, KebabMenuComponent],
})
export class DrawingsPage {

  extensionDataService = inject(ExcalidrawScenesService);
  dialogService = inject(DialogService);

  drawingIdSelected = output<string>();

  drawings = signal<SceneMeta[]>([]);

  async ngOnInit(): Promise<void> {
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
}
