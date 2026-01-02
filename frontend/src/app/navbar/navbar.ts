import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { DetailNav } from '../doc-viewer/doc-types';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {
  @Input({ required: true }) nav$!: Observable<DetailNav>;
  @Input({ required: true }) listRoute: string = '';  // ej. '/divinos-rollos'
  @Input({ required: true }) listLabel: string = 'LISTADO'; // ej. 'LISTADO DIVINOS ROLLOS'
  @Input({ required: true }) detailRoute: string = ''; // ej. '/divino-rollo'
}
