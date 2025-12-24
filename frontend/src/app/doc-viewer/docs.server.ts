import { Injectable, PendingTasks } from '@angular/core';
import { from, Observable, defer } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { DocJson } from './md-types';
import { DocIndexPage } from './doc-types';
import { DocsApi } from './docs.api';

function findPublicDir(): string {
  let dir = process.cwd();

  for (let i = 0; i < 10; i++) {
    const candA = join(dir, "public");
    if (existsSync(candA)) return candA;

    const candB = join(dir, "frontend", "public");
    if (existsSync(candB)) return candB;

    dir = dirname(dir);
  }

  throw new Error(
    `No encontre la carpeta "public". Probe desde:\n- ${process.cwd()}\n` +
    `Asegurate de tener public o frontend/public en tu repo.`
  );
}

@Injectable()
export class DocsServer implements DocsApi {
  private readonly publicDir = findPublicDir();

  constructor(private pending: PendingTasks) { }

  private readJson<T>(rel: string): Observable<T> {
    const file = join(this.publicDir, rel);

    return defer(() => {
      const done = this.pending.add(); // <- bloquea estabilidad SSR/SSG
      return from(readFile(file, 'utf-8')).pipe(
        map((txt) => JSON.parse(txt) as T),
        finalize(() => done()) // <- libera la tarea pase lo que pase
      );
    });
  }

  getDoc(id: string | number): Observable<DocJson> {
    return this.readJson<DocJson>(`docs/${id}.json`);
  }

  getRolloDoc(id: string | number): Observable<DocJson> {
    return this.readJson<DocJson>(`docs/rollo/${id}.json`);
  }

  getMiniRolloDoc(id: string | number): Observable<DocJson> {
    return this.readJson<DocJson>(`docs/divino-minirollo/${id}.json`);
  }

  getLeyDoc(id: string | number): Observable<DocJson> {
    return this.readJson<DocJson>(`docs/divina-ley/${id}.json`);
  }

  getRolloIndexPageRemote(page: number): Observable<DocIndexPage> {
    return this.readJson<DocIndexPage>(`docs/rollo/index/pages/${page}.json`);
  }

  getMiniRolloIndexPageRemote(page: number): Observable<DocIndexPage> {
    return this.readJson<DocIndexPage>(`docs/divino-minirollo/index/pages/${page}.json`);
  }

  getDivinaLeyIndexPageRemote(page: number): Observable<DocIndexPage> {
    return this.readJson<DocIndexPage>(`docs/divinas-leyes/index/pages/${page}.json`);
  }
}
