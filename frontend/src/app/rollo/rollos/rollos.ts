import { Component, ChangeDetectionStrategy, OnInit, Inject } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { Observable } from "rxjs";
import { DocIndexPage } from "../../doc-viewer/doc-types";
import { Pagination } from "../../doc-viewer/pagination";
import { Footer } from "../../footer/footer";
import { DOCS, DocsApi } from "../../doc-viewer/docs.api";

@Component({
  selector: "app-rollos",
  standalone: true,
  imports: [CommonModule, RouterModule, Footer],
  providers: [Pagination],
  templateUrl: "./rollos.html",
  styleUrl: "./rollos.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Rollos implements OnInit {
  // Página actual del índice remoto
  page$!: Observable<DocIndexPage>;
  // Arreglo [1..totalPages] para render del paginador
  pages$!: Observable<number[]>;

  // (opcional) un título de encabezado si querés mantenerlo
  //titulo = "MENSAJE TELEPÁTICO DEL PADRE ETERNO AL MUNDO TERRESTRE; MENSAJE SEGUNDO; EL PRIMER MENSAJE FUE OCULTADO AL MUNDO POR LA ROCA RELIGIOSA.-";

  constructor(private route: ActivatedRoute, private router: Router, @Inject(DOCS) private docs: DocsApi, private pagination: Pagination) { } // @Inject(Pagination)

  ngOnInit(): void {
    // Leemos ?page=N (default 1) y pedimos el JSON remoto
    this.page$ = this.pagination.createPage$(n => this.docs.getRolloIndexPageRemote(n));
    this.pages$ = this.pagination.createPages$(this.page$);
  }

  gotoPage(n: number) {
    this.router.navigate(["../", n], { relativeTo: this.route });
  }

  // trackBy helpers
  trackPage = (_: number, n: number) => n;
  trackItemId = (_: number, it: { id: number }) => it.id;
}
