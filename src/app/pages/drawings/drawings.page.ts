import { Component, output } from '@angular/core';

@Component({
  selector: 'app-drawings',
  templateUrl: './drawings.page.html',
  styleUrl: './drawings.page.scss'
})
export class DrawingsPage {

  drawingIdSelected = output<string>();

  drawings: { id: string }[] = [{ id: 'A' }, { id: 'B' }];
}
