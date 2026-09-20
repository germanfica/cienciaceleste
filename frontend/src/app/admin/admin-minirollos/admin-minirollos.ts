import { ChangeDetectionStrategy, Component, Inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { Observable } from "rxjs";
import { DocIndexPage } from "../../doc-viewer/doc-types";
import { Pagination } from "../../doc-viewer/pagination";
import { Footer } from "../../footer/footer";
import { IndexPaginator } from "../../index-paginator/index-paginator";
import { DOCS, DocsApi } from "../../doc-viewer/docs.api";
import { AdminTopbar } from "../admin-topbar/admin-topbar";

@Component({
  selector: 'app-admin-minirollos',
  imports: [CommonModule, RouterModule, Footer, IndexPaginator, AdminTopbar],
  providers: [Pagination],
  templateUrl: './admin-minirollos.html',
  styleUrl: './admin-minirollos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminMinirollos {
  page$!: Observable<DocIndexPage>;
  pages$!: Observable<number[]>;

  constructor(
    @Inject(DOCS) private docs: DocsApi,
    private pagination: Pagination
  ) {}

  ngOnInit(): void {
    this.page$ = this.pagination.createPage$(n => this.docs.getMiniRolloIndexPageRemote(n));
    this.pages$ = this.pagination.createPages$(this.page$);
  }

  deleteMinirollo(id: number): void {
    const confirmed = window.confirm(`¿Eliminar el divino rollo ${id}?`);

    if (!confirmed) {
      return;
    }

    window.alert("La eliminación todavía debe conectarse al almacenamiento de los minirollos.");
  }

  trackItemId = (_: number, item: { id: number }): number => item.id;
}
