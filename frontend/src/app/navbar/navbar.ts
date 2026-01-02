import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { Component, Inject, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { DetailNav } from '../doc-viewer/doc-types';
import { GoogleTranslateWidget } from '../google-translate-widget/google-translate-widget';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterModule, GoogleTranslateWidget],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {
  @Input({ required: true }) nav$!: Observable<DetailNav>;
  @Input({ required: true }) listRoute: string = '';  // ej. '/divinos-rollos'
  @Input({ required: true }) listLabel: string = 'LISTADO'; // ej. 'LISTADO DIVINOS ROLLOS'
  @Input({ required: true }) detailRoute: string = ''; // ej. '/divino-rollo'

  constructor(@Inject(APP_BASE_HREF) private baseHref: string) {}

  hardHref(id: number): string {
    const base = (this.baseHref || '/').replace(/\/+$/, '');          // '/repo' o '' si era '/'
    const route = ('/' + (this.listRoute || '')).replace(/\/+/g, '/'); // asegura 1 solo '/'
    const routeNoTrail = route.replace(/\/+$/, '');
    return `${base}${routeNoTrail}/${id}`;                             // '/repo/divinos-rollos/12' o '/divinos-rollos/12'
  }
}
