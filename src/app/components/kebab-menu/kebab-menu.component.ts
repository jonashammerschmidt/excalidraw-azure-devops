import { Component, ElementRef, HostListener, inject, output, signal } from '@angular/core';

@Component({
  selector: 'app-kebab-menu',
  imports: [],
  templateUrl: './kebab-menu.component.html',
  styleUrl: './kebab-menu.component.scss'
})
export class KebabMenuComponent {
  host = inject(ElementRef<HTMLElement>);

  readonly open = signal(false);

  readonly rename = output<void>();
  readonly delete = output<void>();

  toggle() { this.open.update(v => !v); }
  onRename() { this.open.set(false); this.rename.emit(); }
  onDelete() { this.open.set(false); this.delete.emit(); }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
