import { Component, ChangeDetectionStrategy, OnInit, Inject } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { EMPTY, Observable, switchMap, catchError, shareReplay } from "rxjs";
import { Block, Inline, DocJson } from "./md-types";
import { DOCS, DocsApi } from "./docs.api";

@Component({
  selector: "app-doc-viewer",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./doc-viewer.html",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocViewer implements OnInit {
  doc$!: Observable<DocJson>;

  constructor(private route: ActivatedRoute, private router: Router, @Inject(DOCS) private docs: DocsApi) { }

  ngOnInit(): void {
    this.doc$ = this.route.paramMap.pipe(
      switchMap(p => {
        const id = p.get("id");
        if (!id) {
          this.router.navigateByUrl("/docs/404");
          return EMPTY; // no emite, no null
        }
        return this.docs.getDoc(String(id));
      }),
      // si hay error (404 del JSON), redirigimos y no emitimos
      catchError(() => {
        this.router.navigateByUrl("/docs/404");
        return EMPTY;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  // funciones de tracking
  trackBlock(i: number, b: Block) { return i; }
  trackInline(i: number, s: Inline) { return i; }
  trackInlineArray(i: number, arr: Inline[]) { return i; }
}
