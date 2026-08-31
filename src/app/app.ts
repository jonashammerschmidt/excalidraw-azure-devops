import { Component, Injector, OnInit, effect, inject, signal } from '@angular/core';
import { DrawingPage } from './pages/drawing/drawing.page';
import { DrawingsPage } from './pages/drawings/drawings.page';
import { DATA_SERVICE, IDataService } from './services/data/interfaces/i-data.service';
import { LoggingService } from './services/logging/logging.service';
import { QueryParamService } from './services/query-param/query-param.service';

@Component({
  selector: 'app-root',
  imports: [DrawingsPage, DrawingPage],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private injector = inject(Injector);
  private dataService = inject<IDataService>(DATA_SERVICE);
  private loggingService = inject(LoggingService);
  private queryParamService = inject(QueryParamService);

  ready = signal(false);
  initializationError = signal<string | null>(null);
  drawingId = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      this.loggingService.initialize();
      await this.dataService.initialize();

      await new Promise((resolve) => setTimeout(resolve, 0));
      this.drawingId.set(await this.queryParamService.getParam('drawingId') ?? null);

      effect(() => {
        const drawingId = this.drawingId();
        void this.queryParamService.setParam('drawingId', drawingId);
      }, { injector: this.injector });

      this.initializationError.set(null);
      this.ready.set(true);
    } catch (error: unknown) {
      this.initializationError.set('The Azure DevOps connection could not be initialized. Restore your session and retry.');
      console.error(error);
    }
  }
}
