import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject } from "@angular/core";
import { RouterModule } from "@angular/router";
import { Observable } from "rxjs";
import { Block, DocJson, Inline } from '../../doc-viewer/md-types';
import { DetailNav } from "../../doc-viewer/doc-types";
import { Navigation } from '../../navbar/navigation';
import { Navbar } from "../../navbar/navbar";
import { Detail } from '../../doc-viewer/detail';
import { Footer } from "../../footer/footer";
import { ScrollTracker } from '../../doc-viewer/scroll-tracker';
import { DOCS, DocsApi } from '../../doc-viewer/docs.api';

@Component({
  selector: 'app-minirollo-detalle',
  imports: [CommonModule, RouterModule, Navbar, ScrollTracker, Footer],
  providers: [Navigation, Detail],
  templateUrl: './minirollo-detalle.html',
  styleUrl: './minirollo-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MinirolloDetalle {
  doc$!: Observable<DocJson>;
  nav$!: Observable<DetailNav>;
  id$!: Observable<number>;

  constructor(@Inject(DOCS) private docs: DocsApi, private detail: Detail) { }

  ngOnInit(): void {
    this.id$ = this.detail.buildId$();
    this.doc$ = this.detail.buildDoc$(id => this.docs.getMiniRolloDoc(id));
    this.nav$ = this.detail.buildNav$(this.id$, p => this.docs.getMiniRolloIndexPageRemote(p));
  }

  // funciones de tracking
  trackBlock(i: number, b: Block) { return i; }
  trackInline(i: number, s: Inline) { return i; }
  trackInlineArray(i: number, arr: Inline[]) { return i; }
}
