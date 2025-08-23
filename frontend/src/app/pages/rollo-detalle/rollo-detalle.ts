import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Docs } from '../../doc-viewer/docs';
import { Block, DocJson, Inline } from '../../doc-viewer/md-types';
import { catchError, EMPTY, Observable, shareReplay, switchMap } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rollo-detalle',
  imports: [CommonModule, RouterModule],
  templateUrl: './rollo-detalle.html',
  styleUrl: './rollo-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolloDetalle {
  doc$!: Observable<DocJson>;

  constructor(private route: ActivatedRoute, private router: Router, private docs: Docs) { }

  ngOnInit(): void {
    this.doc$ = this.route.paramMap.pipe(
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

  // funciones de tracking
  trackBlock(i: number, b: Block) { return i; }
  trackInline(i: number, s: Inline) { return i; }
  trackInlineArray(i: number, arr: Inline[]) { return i; }
}
