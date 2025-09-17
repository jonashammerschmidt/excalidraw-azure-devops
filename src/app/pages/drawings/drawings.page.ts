import { Component, inject, output, signal } from '@angular/core';
import { ExcalidrawScenesService, SceneMeta } from '../../model/excalidraw-scenes/excalidraw-scenes.service';
import { newGuid } from '../../helpers/utils/guid.helper';

@Component({
  selector: 'app-drawings',
  templateUrl: './drawings.page.html',
  styleUrl: './drawings.page.scss'
})
export class DrawingsPage {

  extensionDataService = inject(ExcalidrawScenesService);

  drawingIdSelected = output<string>();

  drawings = signal<SceneMeta[]>([]);

  async ngOnInit(): Promise<void> {
    this.drawings.set(await this.extensionDataService.listScenes());
  }

  async add(): Promise<void> {
    await this.extensionDataService.saveScene({
      id: newGuid(),
      name: "Hallo " + Math.floor(1 + (Math.random() * 100)),
      elements: [],
      __etag: 0,
    });
    await this.ngOnInit();
  }
}
