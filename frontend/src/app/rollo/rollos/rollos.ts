import { Component, ChangeDetectionStrategy, OnInit } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { EMPTY, Observable, catchError, map, shareReplay, switchMap } from "rxjs";
import { Docs } from "../../doc-viewer/docs";
import { DocIndexPage } from "../../doc-viewer/doc-types";

@Component({
  selector: "app-rollos",
  standalone: true,
  imports: [CommonModule, RouterModule],
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

  constructor(private route: ActivatedRoute, private router: Router, private docs: Docs) { }

  ngOnInit(): void {
    // Leemos ?page=N (default 1) y pedimos el JSON remoto
    this.page$ = this.route.queryParamMap.pipe(
      map(q => {
        const n = Number(q.get("page") || "1");
        return Number.isFinite(n) && n >= 1 ? n : 1;
      }),
      switchMap(n => this.docs.getRolloIndexPageRemote(n)),
      catchError(() => {
        // Si 404 u otro error, volvemos a la página 1
        this.router.navigate([], { relativeTo: this.route, queryParams: { page: 1 } });
        return EMPTY;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.pages$ = this.page$.pipe(
      map(p => Array.from({ length: p.totalPages }, (_, i) => i + 1)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  gotoPage(n: number) {
    this.router.navigate([], { relativeTo: this.route, queryParams: { page: n } });
  }

  // trackBy helpers
  trackPage = (_: number, n: number) => n;
  trackItemId = (_: number, it: { id: number }) => it.id;
}
