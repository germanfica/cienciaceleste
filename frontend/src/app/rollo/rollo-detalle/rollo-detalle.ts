import { ChangeDetectionStrategy, Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { Docs } from "../../doc-viewer/docs";
import { Block, DocJson, Inline } from "../../doc-viewer/md-types";
import { CommonModule } from "@angular/common";
import { EMPTY, Observable, catchError, map, shareReplay, switchMap } from "rxjs";
import { DocIndexPage } from "../../doc-viewer/doc-types";
import { Navbar } from "../../navbar/navbar";

@Component({
  selector: 'app-rollo-detalle',
  imports: [CommonModule, RouterModule, Navbar],
  templateUrl: './rollo-detalle.html',
  styleUrl: './rollo-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolloDetalle implements OnInit {
  doc$!: Observable<DocJson>;
  id$!: Observable<number>;

  constructor(private route: ActivatedRoute, private router: Router, private docs: Docs) {
    this.fetchIndexPage = this.docs.getRolloIndexPageRemote.bind(this.docs);
  }

  ngOnInit(): void {
    this.id$ = this.buildId$();
    this.doc$ = this.buildDoc$();
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
        return this.docs.getRolloDoc(String(id));
      }),
      // si hay error (404 del JSON), redirigimos y no emitimos
      catchError(() => {
        this.router.navigateByUrl("/docs/404");
        return EMPTY;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  fetchIndexPage: (page: number) => Observable<DocIndexPage>;

  // funciones de tracking
  trackBlock(i: number, b: Block) { return i; }
  trackInline(i: number, s: Inline) { return i; }
  trackInlineArray(i: number, arr: Inline[]) { return i; }
}
