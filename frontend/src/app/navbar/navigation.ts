import { Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, shareReplay, switchMap } from 'rxjs';
import { DetailNav, DocIndexPage } from '../doc-viewer/doc-types';

@Injectable({
  providedIn: 'root'
})
export class Navigation {
  private readonly DEFAULT_PAGE_SIZE = 10;

  createNav$(
    id$: Observable<number>,
    fetchIndexPage: (page: number) => Observable<DocIndexPage>
  ): Observable<DetailNav> {
    return id$.pipe(
      switchMap(currentId => {
        if (!Number.isFinite(currentId) || currentId <= 0) {
          return of({ page: 1, hasPrev: false, hasNext: false, prevId: 0, nextId: 0 } as DetailNav);
        }

        const pageGuess = Math.floor((currentId - 1) / this.DEFAULT_PAGE_SIZE) + 1;

        return fetchIndexPage(pageGuess).pipe(
          switchMap(meta => {
            const items = meta.items || [];
            const i = items.findIndex(it => it.id === currentId);

            if (i === -1) {
              return of({ page: meta.page, hasPrev: false, hasNext: false, prevId: 0, nextId: 0 } as DetailNav);
            }

            const needPrevFromPrevPage = i === 0 && meta.hasPrev;
            const needNextFromNextPage = i === items.length - 1 && meta.hasNext;

            const prevId$ = needPrevFromPrevPage
              ? fetchIndexPage(meta.page - 1).pipe(
                map(prevPage => (prevPage.items.length ? prevPage.items[prevPage.items.length - 1].id : 0))
              )
              : of(i > 0 ? items[i - 1].id : 0);

            const nextId$ = needNextFromNextPage
              ? fetchIndexPage(meta.page + 1).pipe(
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
                nextId,
              } as DetailNav))
            );
          })
        );
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }
}
