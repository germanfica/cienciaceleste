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
  selector: "app-admin-rollos",
  imports: [CommonModule, RouterModule, Footer, IndexPaginator],
  providers: [Pagination],
  templateUrl: "./admin-rollos.html",
  styleUrl: "./admin-rollos.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminRollos implements OnInit {
  page$!: Observable<DocIndexPage>;
  pages$!: Observable<number[]>;

  constructor(
    @Inject(DOCS) private docs: DocsApi,
    private pagination: Pagination
  ) {}

  ngOnInit(): void {
    this.page$ = this.pagination.createPage$(page => this.docs.getRolloIndexPageRemote(page));
    this.pages$ = this.pagination.createPages$(this.page$);
  }

  deleteRollo(id: number): void {
    const confirmed = window.confirm(`¿Eliminar el divino rollo ${id}?`);

    if (!confirmed) {
      return;
    }

    window.alert("La eliminación todavía debe conectarse al almacenamiento de los rollos.");
  }

  trackItemId = (_: number, item: { id: number }): number => item.id;
}
