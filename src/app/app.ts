import { Component, OnInit, inject, signal } from '@angular/core';
import { DrawingPage } from './pages/drawing/drawing.page';
import { DrawingsPage } from './pages/drawings/drawings.page';
import { ExcalidrawScenesService } from './model/excalidraw-scenes/excalidraw-scenes.service';
import { queryParamSignal } from './helpers/angular/query-params-signal.helper';
import { DATA_SERVICE, IDataService } from './services/data/interfaces/i-data.service';
import { DialogService } from './services/dialog/dialog.service';

@Component({
  selector: 'app-root',
  imports: [DrawingsPage, DrawingPage],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private dataService = inject<IDataService>(DATA_SERVICE);
  
  ready = signal(false);
  drawingId = queryParamSignal('drawingId');

  async ngOnInit(): Promise<void> {
    await this.dataService.initialize();
    this.ready.set(true);
  }
}