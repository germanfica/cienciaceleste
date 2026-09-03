import { ChangeDetectionStrategy, Component, Inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { Observable } from "rxjs";
import { DocIndexPage } from "../../doc-viewer/doc-types";
import { Pagination } from "../../doc-viewer/pagination";
import { Footer } from "../../footer/footer";
import { IndexPaginator } from "../../index-paginator/index-paginator";
import { DOCS, DocsApi } from "../../doc-viewer/docs.api";

@Component({
  selector: 'app-admin-divinas-leyes',
  imports: [CommonModule, RouterModule, Footer, IndexPaginator],
  providers: [Pagination],
  templateUrl: './admin-divinas-leyes.html',
  styleUrl: './admin-divinas-leyes.scss',
})
export class AdminDivinasLeyes implements OnInit {
  page$!: Observable<DocIndexPage>;
  pages$!: Observable<number[]>;

  constructor(
    @Inject(DOCS) private docs: DocsApi,
    private pagination: Pagination
  ) {}

  ngOnInit(): void {
    this.page$ = this.pagination.createPage$(n => this.docs.getDivinaLeyIndexPageRemote(n));
    this.pages$ = this.pagination.createPages$(this.page$);
  }

  deleteDivinaLey(id: number): void {
    const confirmed = window.confirm(`¿Eliminar la divina ley ${id}?`);

    if (!confirmed) {
      return;
    }

    window.alert("La eliminación todavía debe conectarse al almacenamiento de las divinas leyes.");
  }

  trackItemId = (_: number, item: { id: number }): number => item.id;
}
