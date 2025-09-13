import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Navigation } from '../navbar/navigation';
import { catchError, EMPTY, map, Observable, shareReplay, switchMap } from 'rxjs';
import { DocJson } from './md-types';
import { DetailNav } from './doc-types';

@Injectable()
export class Detail {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navigation: Navigation
  ) { }

  buildId$(): Observable<number> {
    return this.route.paramMap.pipe(
      map(pm => Number(pm.get("id") || "0")),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  buildDoc$(fetchDoc: (id: string) => Observable<DocJson>): Observable<DocJson> {
    return this.route.paramMap.pipe(
      switchMap(p => {
        const id = p.get("id");
        if (!id) {
          this.router.navigateByUrl("/docs/404");
          return EMPTY;
        }
        return fetchDoc(id);
      }),
      catchError(() => {
        this.router.navigateByUrl("/docs/404");
        return EMPTY;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  buildNav$(
    id$: Observable<number>,
    fetchIndexPage: (page: number) => Observable<any>
  ): Observable<DetailNav> {
    return this.navigation.createNav$(id$, fetchIndexPage);
  }
}
