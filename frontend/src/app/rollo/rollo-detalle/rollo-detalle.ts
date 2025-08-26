import { ChangeDetectionStrategy, Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { Docs } from "../../doc-viewer/docs";
import { Block, DocJson, Inline } from "../../doc-viewer/md-types";
import { CommonModule } from "@angular/common";
import { EMPTY, Observable, catchError, forkJoin, map, of, shareReplay, switchMap } from "rxjs";
import { DetailNav, DocIndexPage } from "../../doc-viewer/doc-types";

@Component({
  selector: 'app-rollo-detalle',
  imports: [CommonModule, RouterModule],
  templateUrl: './rollo-detalle.html',
  styleUrl: './rollo-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolloDetalle implements OnInit {
  doc$!: Observable<DocJson>;
  nav$!: Observable<DetailNav>;

  private readonly DEFAULT_PAGE_SIZE = 10;

  constructor(private route: ActivatedRoute, private router: Router, private docs: Docs) { }

  ngOnInit(): void {
    // Documento
    this.doc$ = this.route.paramMap.pipe(
      switchMap(p => {
        const id = p.get("id");
        if (!id) {
          this.router.navigateByUrl("/docs/404");
          return EMPTY; // no emite, no null
        }
        return this.docs.getRolloDoc(String(id));
      }),
      // si hay error (404 del JSON), redirigimos y no emitimos
      catchError(() => {
        this.router.navigateByUrl("/docs/404");
        return EMPTY;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    // Navegación Anterior/Siguiente sin nulls
    this.nav$ = this.route.paramMap.pipe(
      map(pm => Number(pm.get("id") || "0")),
      switchMap(currentId => {
        if (!Number.isFinite(currentId) || currentId <= 0) {
          return of({ page: 1, hasPrev: false, hasNext: false, prevId: 0, nextId: 0 } as DetailNav);
        }

        const pageGuess = Math.floor((currentId - 1) / this.DEFAULT_PAGE_SIZE) + 1;

        return this.docs.getRolloIndexPageRemote(pageGuess).pipe(
          switchMap((meta: DocIndexPage) => {
            const items = meta.items || [];
            const i = items.findIndex(it => it.id === currentId);

            if (i === -1) {
              // Si no se encuentra, mejor no inventar vecinos
              return of({ page: meta.page, hasPrev: false, hasNext: false, prevId: 0, nextId: 0 } as DetailNav);
            }

            const needPrevFromPrevPage = i === 0 && meta.hasPrev;
            const needNextFromNextPage = i === items.length - 1 && meta.hasNext;

            const prevId$ = needPrevFromPrevPage
              ? this.docs.getRolloIndexPageRemote(meta.page - 1).pipe(
                map(prevPage => (prevPage.items.length ? prevPage.items[prevPage.items.length - 1].id : 0))
              )
              : of(i > 0 ? items[i - 1].id : 0);

            const nextId$ = needNextFromNextPage
              ? this.docs.getRolloIndexPageRemote(meta.page + 1).pipe(
                map(nextPage => (nextPage.items.length ? nextPage.items[0].id : 0))
              )
              : of(i < items.length - 1 ? items[i + 1].id : 0);

            const hasPrev = i > 0 || meta.hasPrev;
            const hasNext = i < items.length - 1 || meta.hasNext;

            return forkJoin({ prevId: prevId$, nextId: nextId$ }).pipe(
              map(({ prevId, nextId }) => ({
                page: meta.page,
                hasPrev,
                hasNext,
                prevId,
                nextId
              } as DetailNav))
            );
          })
        );
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  // funciones de tracking
  trackBlock(i: number, b: Block) { return i; }
  trackInline(i: number, s: Inline) { return i; }
  trackInlineArray(i: number, arr: Inline[]) { return i; }
}
