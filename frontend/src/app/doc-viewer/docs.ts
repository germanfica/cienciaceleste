// docs.ts
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { DocJson } from "./md-types";
import { RolloIndexPage } from "./rollo-types";

@Injectable({ providedIn: "root" })
export class Docs {
  constructor(private http: HttpClient) { }
  getDoc(id: string | number): Observable<DocJson> {
    return this.http.get<DocJson>(`/docs/${id}.json`);
  }

  getRolloDoc(id: string | number): Observable<DocJson> {
    return this.http.get<DocJson>(`/docs/rollo/${id}.json`);
  }

  getMiniRolloDoc(id: string | number): Observable<DocJson> {
    return this.http.get<DocJson>(`/docs/mini-rollo/${id}.json`);
  }

  getLeyDoc(id: string | number): Observable<DocJson> {
    return this.http.get<DocJson>(`/docs/divina-ley/${id}.json`);
  }

  getRolloIndexPageRemote(page: number): Observable<RolloIndexPage> {
    return this.http.get<RolloIndexPage>(`/docs/rollo/index/pages/${page}.json`);
  }

}
