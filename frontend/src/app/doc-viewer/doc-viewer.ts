// doc-viewer.ts
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";

import { Subscription, switchMap } from "rxjs";
import { Block, DocJson, Inline } from "./md-types";
import { Docs } from "./docs";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-doc-viewer",
  imports: [CommonModule, RouterModule],
  templateUrl: "./doc-viewer.html",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocViewer implements OnInit, OnDestroy {
  doc?: DocJson;
  private sub?: Subscription;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private docs: Docs,
    private cdr: ChangeDetectorRef
  ) {}
  ngOnInit(): void {
    this.sub = this.route.paramMap
      .pipe(switchMap(p => this.docs.getDoc(p.get("id")!)))
      .subscribe({ next: d => {
          this.doc = d;
          this.cdr.markForCheck(); // forzar refresco
      }, error: () => this.router.navigateByUrl("/docs/404") });
  }
  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  // funciones de tracking
  trackBlock(i: number, b: Block) { return i; }
  trackInline(i: number, s: Inline) { return i; }
  trackInlineArray(i: number, arr: Inline[]) { return i; }
}
