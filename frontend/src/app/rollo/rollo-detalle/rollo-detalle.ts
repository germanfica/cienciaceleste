import { ChangeDetectionStrategy, Component, OnInit, OnDestroy } from "@angular/core";
import { RouterModule } from "@angular/router";
import { Docs } from "../../doc-viewer/docs";
import { Block, DocJson, Inline } from "../../doc-viewer/md-types";
import { CommonModule } from "@angular/common";
import { Observable, Subscription } from "rxjs";
import { DetailNav } from "../../doc-viewer/doc-types";
import { Navbar } from "../../navbar/navbar";
import { Navigation } from "../../navbar/navigation";
import { Detail } from "../../doc-viewer/detail";
import { ScrollProgress } from "../../doc-viewer/scroll-progress";
import { ScrollTracker } from "../../doc-viewer/scroll-tracker";
import { Footer } from "../../footer/footer";

@Component({
  selector: 'app-rollo-detalle',
  imports: [CommonModule, RouterModule, Navbar, ScrollTracker, Footer],
  providers: [Navigation, Detail],
  templateUrl: './rollo-detalle.html',
  styleUrl: './rollo-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolloDetalle implements OnInit, OnDestroy {
  doc$!: Observable<DocJson>;
  nav$!: Observable<DetailNav>;
  id$!: Observable<number>;

  private sub = new Subscription();

  constructor(private docs: Docs, private detail: Detail, private scrollProgress: ScrollProgress) { }

  ngOnInit(): void {
    this.id$ = this.detail.buildId$();
    this.doc$ = this.detail.buildDoc$(id => this.docs.getRolloDoc(id));
    this.nav$ = this.detail.buildNav$(this.id$, p => this.docs.getRolloIndexPageRemote(p));

    // arrancar/reiniciar tracking cuando cambia el id
    this.sub.add(
      this.id$.subscribe(id => {
        this.scrollProgress.stop();
        this.scrollProgress.startTracking({
          key: `rollo/${id}`,
          target: window,
          saveEveryMs: 200,
          restoreBehavior: 'auto',
          version: 'v1'
        });
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.scrollProgress.stop();
  }

  // trackBy helpers
  trackBlock(i: number, b: Block) { return i; }
  trackInline(i: number, s: Inline) { return i; }
  trackInlineArray(i: number, arr: Inline[]) { return i; }
}
