// docs.ts
import { Inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { DocJson } from "./md-types";
import { DocIndexPage } from "./doc-types";
import { APP_BASE_HREF } from "@angular/common";
import { DocsApi } from "./docs.api";

@Injectable({ providedIn: 'root' })
export class Docs implements DocsApi {
  constructor(private http: HttpClient, @Inject(APP_BASE_HREF) private baseHref: string) { }

  private url(path: string): string {
    return `${this.baseHref.replace(/\/$/, "")}${path}`;
  }

  private getJson<T>(rel: string): Observable<T> {
    return this.http.get<T>(this.url(`/${rel}`));
  }

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