// docs.ts
import { Inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { DocJson } from "./md-types";
import { DocIndexPage } from "./doc-types";
import { APP_BASE_HREF } from "@angular/common";

@Injectable({ providedIn: 'root' })
export class Docs {
  constructor(private http: HttpClient, @Inject(APP_BASE_HREF) private baseHref: string) { }

  private url(path: string): string {
    // asegura que concatene correctamente /cienciaceleste/
    return `${this.baseHref.replace(/\/$/, '')}${path}`;
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
    return this.http.get<DocJson>(this.url(`/docs/${id}.json`));
  }

  getRolloDoc(id: string | number): Observable<DocJson> {
    return this.http.get<DocJson>(this.url(`/docs/rollo/${id}.json`));
  }

  getMiniRolloDoc(id: string | number): Observable<DocJson> {
    return this.http.get<DocJson>(this.url(`/docs/divino-minirollo/${id}.json`));
  }

  getLeyDoc(id: string | number): Observable<DocJson> {
    return this.http.get<DocJson>(this.url(`/docs/divina-ley/${id}.json`));
  }

  getRolloIndexPageRemote(page: number): Observable<DocIndexPage> {
    return this.http.get<DocIndexPage>(this.url(`/docs/rollo/index/pages/${page}.json`));
  }

  getMiniRolloIndexPageRemote(page: number): Observable<DocIndexPage> {
    return this.http.get<DocIndexPage>(this.url(`/docs/divino-minirollo/index/pages/${page}.json`));
  }

  getDivinaLeyIndexPageRemote(page: number): Observable<DocIndexPage> {
    return this.http.get<DocIndexPage>(this.url(`/docs/divinas-leyes/index/pages/${page}.json`));
  }
}