import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { DocIndexPage } from '../../doc-viewer/doc-types';
import { Docs } from '../../doc-viewer/docs';
import { Pagination } from '../../doc-viewer/pagination';
import { Footer } from "../../footer/footer";
import { IndexPaginator } from '../../index-paginator/index-paginator';

@Component({
  selector: 'app-divinas-leyes',
  imports: [CommonModule, RouterModule, Footer, IndexPaginator],
  providers: [Pagination],
  templateUrl: './divinas-leyes.html',
  styleUrl: './divinas-leyes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DivinasLeyes {
  page$!: Observable<DocIndexPage>;
  pages$!: Observable<number[]>;

  constructor(private route: ActivatedRoute, private router: Router, private docs: Docs, private pagination: Pagination) { }

  ngOnInit(): void {
    this.page$ = this.pagination.createPage$(n => this.docs.getDivinaLeyIndexPageRemote(n));
    this.pages$ = this.pagination.createPages$(this.page$);
  }

  gotoPage(n: number) {
    this.router.navigate(["../", n], { relativeTo: this.route });
  }

  // trackBy helpers
  trackPage = (_: number, n: number) => n;
  trackItemId = (_: number, it: { id: number }) => it.id;
}
