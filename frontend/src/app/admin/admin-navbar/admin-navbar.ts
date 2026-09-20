import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { DetailNav } from '../../doc-viewer/doc-types';

@Component({
  selector: 'app-admin-navbar',
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-navbar.html',
  styleUrl: './admin-navbar.scss',
})
export class AdminNavbar {
  @Input({ required: true }) nav$!: Observable<DetailNav>;
  @Input() homeRoute: string = '/';
  @Input({ required: true }) listRoute: string = '';  // ej. '/divinos-rollos'
  @Input({ required: true }) listLabel: string = 'LISTADO'; // ej. 'LISTADO DIVINOS ROLLOS'
  @Input({ required: true }) detailRoute: string = ''; // ej. '/divino-rollo'
}
