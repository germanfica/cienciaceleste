import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DocIndexPage } from '../doc-viewer/doc-types';

@Component({
  selector: 'app-index-paginator',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './index-paginator.html',
  styleUrl: './index-paginator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IndexPaginator {
  @Input({ required: true }) routeBase!: string;        // ej: '/divinos-rollos'
  @Input({ required: true }) page!: DocIndexPage;       // DocIndexPage actual
  @Input({ required: true }) pages: readonly number[] = []; // [1..totalPages]

  trackPage = (_: number, n: number) => n;
}
