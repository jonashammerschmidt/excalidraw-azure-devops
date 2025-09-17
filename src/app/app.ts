import { Component, OnInit, inject } from '@angular/core';
import { DrawingPage } from './pages/drawing/drawing.page';
import { DrawingsPage } from './pages/drawings/drawings.page';
import { ExcalidrawScenesService } from './model/excalidraw-scenes/excalidraw-scenes.service';
import { queryParamSignal } from './helpers/angular/query-params-signal.helper';

@Component({
  selector: 'app-root',
  imports: [DrawingsPage, DrawingPage],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private extensionDataService = inject(ExcalidrawScenesService);

  drawingId = queryParamSignal('drawingId');

  async ngOnInit(): Promise<void> {
    await this.extensionDataService.extensionDataService.initialize();
  }
}