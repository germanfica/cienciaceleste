import { ChangeDetectionStrategy, Component, OnInit } from "@angular/core";
import { RouterModule } from "@angular/router";
import { Docs } from "../../doc-viewer/docs";
import { Block, DocJson, Inline } from "../../doc-viewer/md-types";
import { CommonModule } from "@angular/common";
import { Observable } from "rxjs";
import { DetailNav } from "../../doc-viewer/doc-types";
import { Navbar } from "../../navbar/navbar";
import { Navigation } from "../../navbar/navigation";
import { Detail } from "../../doc-viewer/detail";

@Component({
  selector: 'app-rollo-detalle',
  imports: [CommonModule, RouterModule, Navbar],
  providers: [Navigation, Detail],
  templateUrl: './rollo-detalle.html',
  styleUrl: './rollo-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolloDetalle implements OnInit {
  doc$!: Observable<DocJson>;
  nav$!: Observable<DetailNav>;
  id$!: Observable<number>;

  constructor(private docs: Docs, private detail: Detail) {
  }

  ngOnInit(): void {
    this.id$ = this.detail.buildId$();
    this.doc$ = this.detail.buildDoc$(id => this.docs.getRolloDoc(id));
    this.nav$ = this.detail.buildNav$(this.id$, p => this.docs.getRolloIndexPageRemote(p));
  }

  // funciones de tracking
  trackBlock(i: number, b: Block) { return i; }
  trackInline(i: number, s: Inline) { return i; }
  trackInlineArray(i: number, arr: Inline[]) { return i; }
}
