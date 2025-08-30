import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin, map, Observable, of, shareReplay, switchMap } from 'rxjs';
import { DetailNav, DocIndexPage } from '../doc-viewer/doc-types';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {
  @Input() nav$!: Observable<DetailNav>;

}
