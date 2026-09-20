// docs.ts
import { Inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map, Observable, throwError } from "rxjs";
import { DocJson } from "./md-types";
import { DocIndexPage } from "./doc-types";
import { APP_BASE_HREF } from "@angular/common";
import { DocsApi } from "./docs.api";

@Injectable({ providedIn: 'root' })
export class Docs implements DocsApi {
  private readonly divinaLeyPageSize = 100;
  constructor(private http: HttpClient, @Inject(APP_BASE_HREF) private baseHref: string) { }

  private url(path: string): string {
    // asegura que concatene correctamente /cienciaceleste/
    return `${this.baseHref.replace(/\/$/, '')}${path}`;
  }

  private getJson<T>(rel: string): Observable<T> {
    return this.http.get<T>(this.url(`/${rel}`));
  }

  /**
   * Legacy endpoint kept only for backward compatibility.
   *
   * NOTE: This expects documents at `/docs/{id}.json`. The project moved docs into
   * category-specific folders (`/docs/rollo`, `/docs/divino-minirollo`, `/docs/divina-ley`),
   * so this method will 404 unless you still ship JSON files at the legacy location.
   *
   * Use one of: `getRolloDoc`, `getMiniRolloDoc`, `getLeyDoc`.
   *
   * @deprecated Use getRolloDoc/getMiniRolloDoc/getLeyDoc instead.
   */
  getDoc(id: string | number): Observable<DocJson> {
    return this.getJson<DocJson>(`docs/${id}.json`);
  }

  getRolloDoc(id: string | number): Observable<DocJson> {
    return this.getJson<DocJson>(`docs/rollo/${id}.json`);
  }

  getMiniRolloDoc(id: string | number): Observable<DocJson> {
    return this.getJson<DocJson>(`docs/divino-minirollo/${id}.json`);
  }

  getLeyDoc(id: string | number): Observable<DocJson> {
    return this.getDivinaLeyDocv2(id);
  }

  private getDivinaLeyDocv2(id: string | number): Observable<DocJson> {
    const numericId = Number(id);

    if (!Number.isInteger(numericId) || numericId < 1) {
      return throwError(() => new Error(`Invalid divina ley ID: ${id}`));
    }

    const page = Math.ceil(numericId / this.divinaLeyPageSize);

    return this.getDivinaLeyIndexPageRemote(page).pipe(
      map(indexPage => {
        const ley = indexPage.items.find(item => item.id === numericId);

        if (!ley) {
          throw new Error(`Divina ley ${numericId} was not found on index page ${page}`);
        }

        return {
          id: ley.id,
          titulo: ley.titulo,
          autor: ley.autor,
          bloques: [],
        };
      }),
    );
  }

  /**
   * @deprecated Use getDivinaLeyDocv2 instead. Divinas leyes are stored in the
   * paginated index and no longer have an individual JSON document.
   */
  private getDivinaLeyDocv1(id: string | number): Observable<DocJson> {
    return this.getJson<DocJson>(`docs/divina-ley/${id}.json`);
  }

  getRolloIndexPageRemote(page: number): Observable<DocIndexPage> {
    return this.getJson<DocIndexPage>(`docs/rollo/index/pages/${page}.json`);
  }

  getMiniRolloIndexPageRemote(page: number): Observable<DocIndexPage> {
    return this.getJson<DocIndexPage>(`docs/divino-minirollo/index/pages/${page}.json`);
  }

  getDivinaLeyIndexPageRemote(page: number): Observable<DocIndexPage> {
    return this.getJson<DocIndexPage>(`docs/divinas-leyes/index/pages/${page}.json`);
  }
}