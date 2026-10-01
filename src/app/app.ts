import { Component } from '@angular/core';
import { SidebarWidgetComponent } from './components/sidebar-widget/sidebar-widget.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SidebarWidgetComponent],
  template: `<app-sidebar-widget />`,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }
  `]
})
export class App {}
