import { Component, inject, output, signal } from '@angular/core';
import { ExcalidrawScenesService, SceneMeta } from '../../model/excalidraw-scenes/excalidraw-scenes.service';
import { newGuid } from '../../helpers/utils/guid.helper';
import { DatePipe } from '@angular/common';
import { DialogService } from '../../services/dialog/dialog.service';

@Component({
  selector: 'app-drawings',
  templateUrl: './drawings.page.html',
  styleUrl: './drawings.page.scss',
  imports: [DatePipe],
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
    const name = await this.dialogService.promptForDrawingName();
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
}
