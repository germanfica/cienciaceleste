// docs.api.ts
import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { DocJson } from './md-types';
import { DocIndexPage } from './doc-types';

export interface DocsApi {
  getDoc(id: string | number): Observable<DocJson>;
  getRolloDoc(id: string | number): Observable<DocJson>;
  getMiniRolloDoc(id: string | number): Observable<DocJson>;
  getLeyDoc(id: string | number): Observable<DocJson>;
  getRolloIndexPageRemote(page: number): Observable<DocIndexPage>;
  getMiniRolloIndexPageRemote(page: number): Observable<DocIndexPage>;
  getDivinaLeyIndexPageRemote(page: number): Observable<DocIndexPage>;
}

export const DOCS = new InjectionToken<DocsApi>('DOCS');
