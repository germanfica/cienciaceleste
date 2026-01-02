import { Injectable } from '@angular/core';
import { catchError, EMPTY, map, Observable, shareReplay, switchMap } from 'rxjs';
import { DocIndexPage } from './doc-types';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * Pagination service.
 *
 * Note:
 * This service does not use `providedIn: 'root'`. It must be explicitly added
 * to the `providers` array of a component in order to be available.
 * If it is injected without being provided, Angular will not raise a compile-time
 * error; instead, it will throw a runtime error (`NG0201: No provider found`).
 *
 * Example:
 *
 * ```ts
 * //@Component({
 *   selector: 'doc-viewer',
 *   standalone: true,
 *   imports: [CommonModule, RouterModule],
 *   providers: [Pagination] // <-- Service must be provided here
 * })
 * export class DocViewer {
 *   page$!: Observable<DocIndexPage>;
 *   pages$!: Observable<number[]>;
 *
 *   constructor(private docs: Docs, private pagination: Pagination) {
 *     this.page$ = this.pagination.createPage$(this.docs.getRolloIndexPageRemote);
 *     this.pages$ = this.pagination.createPages$(this.page$);
 *   }
 * }
 * ```
 */
@Injectable()
export class Pagination {
  constructor(private route: ActivatedRoute, private router: Router) { }

  /**
   * Crea un observable que emite la página actual (DocIndexPage).
   * @param fetchIndexPage Función que obtiene el JSON remoto de índice (ej. docs.getRolloIndexPageRemote)
   */
  createPage$(
    fetchIndexPage: (page: number) => Observable<DocIndexPage>
  ): Observable<DocIndexPage> {
    return this.route.paramMap.pipe(
      map(pm => {
        const n = Number(pm.get("id") || "1");
        return Number.isFinite(n) && n >= 1 ? n : 1;
      }),
      switchMap(n => fetchIndexPage(n)),
      catchError(() => {
        // si hay error, volvemos a la página 1
        this.router.navigate(["../", 1], { relativeTo: this.route });
        return EMPTY;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  /**
   * Dado un observable de página, genera el rango [1..totalPages] para render del paginador.
   */
  createPages$(page$: Observable<DocIndexPage>): Observable<number[]> {
    return page$.pipe(
      map(p => Array.from({ length: p.totalPages }, (_, i) => i + 1)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }
}
