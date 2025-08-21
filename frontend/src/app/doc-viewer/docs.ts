// docs.ts
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { DocJson } from "./md-types";

@Injectable({ providedIn: "root" })
export class Docs {
  constructor(private http: HttpClient) {}
  getDoc(id: string|number): Observable<DocJson> {
    return this.http.get<DocJson>(`/docs/${id}.json`);
  }
}
