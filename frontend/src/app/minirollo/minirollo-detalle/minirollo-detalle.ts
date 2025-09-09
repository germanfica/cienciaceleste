import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, NgZone } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Observable, shareReplay, take } from 'rxjs';
import { Block, DocJson, Inline } from '../../doc-viewer/md-types';
import { Docs } from '../../doc-viewer/docs';
import { DetailNav } from '../../doc-viewer/doc-types';
import { Navigation } from '../../navbar/navigation';
import { Navbar } from '../../navbar/navbar';
import { Detail } from '../../doc-viewer/detail';
import { W } from '../../w/w';
import { Tokenizer, WordTok } from '../../doc-viewer/tokenizer';

@Component({
  selector: 'app-minirollo-detalle',
  imports: [CommonModule, RouterModule, Navbar, W],
  providers: [Navigation, Detail, Tokenizer],
  templateUrl: './minirollo-detalle.html',
  styleUrl: './minirollo-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MinirolloDetalle {
  doc$!: Observable<DocJson>;
  nav$!: Observable<DetailNav>;
  id$!: Observable<number>;

  private docs = inject(Docs);
  private detail = inject(Detail);
  private zone = inject(NgZone);
  private tokenizer = inject(Tokenizer);

  private observer?: IntersectionObserver;

  ngOnInit(): void {
    this.id$ = this.detail.buildId$();
    this.doc$ = this.detail
      .buildDoc$(id => this.docs.getMiniRolloDoc(id))
      .pipe(shareReplay(1));

    this.nav$ = this.detail.buildNav$(
      this.id$,
      p => this.docs.getMiniRolloIndexPageRemote(p)
    );

    // Iniciar observer y reanudar progreso cuando llegue el doc
    this.doc$.pipe(take(1)).subscribe(d => {
      this.tokenizer.clearCache();
      const did = (this.tokenizer as any)['normalizeDocId'](d.id);
      // 👆 mejor exponer un método público normalizeDocId()
      this.initObserver(did);
      this.resumeFromSaved(did);
      this.resumeFromFragment();
    });
  }

  // ---------- Tokenización ----------
  tokenizeBlock(docId: string | number, block: Block, blockIdx: number): WordTok[] {
    return this.tokenizer.tokenizeBlock(docId, block, blockIdx);
  }

  // ---------- TrackBy ----------
  trackBlock(i: number, _b: Block) { return i; }
  trackInline(i: number, _s: Inline) { return i; }
  trackInlineArray(i: number, _arr: Inline[]) { return i; }
  trackWord(_i: number, t: WordTok) { return t.wordId ?? _i; }

  // ---------- Progreso ----------
  private lsKey(docId: string | number) {
    // 👇 podrías mover esto también al servicio si querés centralizarlo
    return `reading:minirollo:${(this.tokenizer as any)['normalizeDocId'](docId)}`;
  }

  onWordClick(wordId: string | undefined, docId: string | number, blockIdx?: number) {
    if (!wordId) return;
    const payload = JSON.stringify({ wordId, blockIdx });
    try { localStorage.setItem(this.lsKey(docId), payload); } catch { }
    this.flash(wordId);
  }

  resumeFromSaved(docId?: string | number) {
    if (!docId) return;
    const raw = localStorage.getItem(this.lsKey(docId));
    if (!raw) return;

    try {
      const { wordId } = JSON.parse(raw);
      if (!wordId) return;

      const sub = this.zone.onStable.subscribe(() => {
        const el = document.getElementById(wordId);
        if (el) {
          const rect = el.getBoundingClientRect();
          const y = rect.top + window.scrollY;
          window.scrollTo({ top: y - 20, behavior: 'auto' });
          this.flash(wordId);
          sub.unsubscribe();
        }
      });
    } catch {
      this.scrollToWord(raw, { smooth: false, center: true });
    }
  }

  resumeFromFragment() {
    const hash = location.hash || '';
    const mEq = hash.match(/#w=([^#]+)/i);
    const mColon = hash.match(/#(w:[^#]+)/i);
    const wid = mEq?.[1] ? decodeURIComponent(mEq[1]) : (mColon?.[1] ?? '');
    if (wid) this.scrollToWord(wid, { smooth: true, center: true });
  }

  private scrollToWord(wordId: string, opts: { smooth: boolean; center: boolean }) {
    const el = document.getElementById(wordId);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const y = rect.top + window.scrollY;
    const margin = 20;

    window.scrollTo({
      top: y - margin,
      behavior: opts.smooth ? 'smooth' : 'auto',
    });

    this.flash(wordId);
  }

  private flash(wordId: string) {
    const el = document.getElementById(wordId);
    if (!el) return;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 600);
  }

  // ---------- IntersectionObserver ----------
  initObserver(docId: string | number) {
    if (this.observer) return;
    const did = (this.tokenizer as any)['normalizeDocId'](docId);
    this.observer = new IntersectionObserver(entries => {
      const vis = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop);
      if (!vis.length) return;
      const topMost = vis[0].target as HTMLElement;
      try { localStorage.setItem(this.lsKey(did), topMost.id); } catch { }
    }, { root: null, rootMargin: '0px', threshold: 0.01 });
  }
}
