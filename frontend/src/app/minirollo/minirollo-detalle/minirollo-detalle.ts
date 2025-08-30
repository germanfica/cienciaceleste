import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { EMPTY, Observable, catchError, map, shareReplay, switchMap } from "rxjs";
import { Block, DocJson, Inline } from '../../doc-viewer/md-types';
import { Docs } from "../../doc-viewer/docs";
import { DetailNav } from "../../doc-viewer/doc-types";
import { Navigation } from '../../navbar/navigation';
import { Navbar } from "../../navbar/navbar";

@Component({
  selector: 'app-minirollo-detalle',
  imports: [CommonModule, RouterModule, Navbar],
  providers: [Navigation],
  templateUrl: './minirollo-detalle.html',
  styleUrl: './minirollo-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MinirolloDetalle {
  doc$!: Observable<DocJson>;
  nav$!: Observable<DetailNav>;
  id$!: Observable<number>;

  constructor(private route: ActivatedRoute, private router: Router, private docs: Docs, private navigation: Navigation) { }

  ngOnInit(): void {
    this.id$ = this.buildId$();
    this.doc$ = this.buildDoc$();
    this.nav$ = this.buildNav$();
  }

  private buildId$(): Observable<number> {
    return this.route.paramMap.pipe(
      map(pm => Number(pm.get("id") || "0")),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  private buildDoc$(): Observable<DocJson> {
    return this.route.paramMap.pipe(
      switchMap(p => {
        const id = p.get("id");
        if (!id) {
          this.router.navigateByUrl("/docs/404");
          return EMPTY; // no emite, no null
        }
        return this.docs.getMiniRolloDoc(String(id));
      }),
      // si hay error (404 del JSON), redirigimos y no emitimos
      catchError(() => {
        this.router.navigateByUrl("/docs/404");
        return EMPTY;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  private buildNav$(): Observable<DetailNav> {
    return this.navigation.createNav$(
      this.id$,
      (page: number) => this.docs.getMiniRolloIndexPageRemote(page)
    );
  }

  // funciones de tracking
  trackBlock(i: number, b: Block) { return i; }
  trackInline(i: number, s: Inline) { return i; }
  trackInlineArray(i: number, arr: Inline[]) { return i; }
}
