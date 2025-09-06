import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, NgZone, NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Observable, shareReplay, take } from 'rxjs';
import { Block, DocJson, Inline } from '../../doc-viewer/md-types';
import { Docs } from '../../doc-viewer/docs';
import { DetailNav } from '../../doc-viewer/doc-types';
import { Navigation } from '../../navbar/navigation';
import { Navbar } from '../../navbar/navbar';
import { Detail } from '../../doc-viewer/detail';
import { W } from '../../w/w';
import { Cp } from '../../cp/cp';

type TokKind = 'word' | 'space' | 'punct';
type WordTok = { kind: TokKind; text: string; wordIndexInBlock?: number; wordId?: string };

const toB36 = (n: number) => n.toString(36);

function hashStringToInt(s: string): number {
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h & 0x7fffffff) % 2147483647;
}

function normalizeDocId(id: string | number): number {
  if (typeof id === 'number') return id;
  const n = Number(id);
  return Number.isFinite(n) ? n : hashStringToInt(id);
}

function makeWordId(docId: string | number, blockIdx: number, wordIdxInBlock: number): string {
  const did = normalizeDocId(docId);
  return `w:${toB36(did)}.${toB36(blockIdx)}.${toB36(wordIdxInBlock)}`;
}

// Segmentador: usa Intl.Segmenter si existe; si no, regex robusto.
const seg = (text: string): WordTok[] => {
  const SegCtor = (globalThis as any).Intl?.Segmenter as
    | (new (locale?: string | string[], options?: { granularity?: 'grapheme' | 'word' | 'sentence' }) => Intl.Segmenter)
    | undefined;

  if (SegCtor) {
    const S = new SegCtor(undefined, { granularity: 'word' });
    const out: WordTok[] = [];
    let lastEnd = 0;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore TS no conoce bien el iterador de Segments en algunas libs
    for (const { segment, isWordLike, index } of S.segment(text)) {
      if (index > lastEnd) {
        const gap = text.slice(lastEnd, index);
        for (const ch of gap) {
          if (/\s/.test(ch)) out.push({ kind: 'space', text: ch });
          else out.push({ kind: 'punct', text: ch });
        }
      }
      if (isWordLike) out.push({ kind: 'word', text: segment });
      else out.push({ kind: /\s/.test(segment) ? 'space' : 'punct', text: segment });
      lastEnd = index + segment.length;
    }
    if (lastEnd < text.length) {
      const tail = text.slice(lastEnd);
      for (const ch of tail) {
        if (/\s/.test(ch)) out.push({ kind: 'space', text: ch });
        else out.push({ kind: 'punct', text: ch });
      }
    }
    return out;
  }

  // Fallback
  const re = /(\p{L}[\p{L}\p{Mn}\p{Nd}\p{Pc}]*)|(\s+)|([^\s\p{L}\p{Mn}\p{Nd}\p{Pc}])/gu;
  const out: WordTok[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[1]) out.push({ kind: 'word', text: m[1] });
    else if (m[2]) out.push({ kind: 'space', text: m[2] });
    else if (m[3]) out.push({ kind: 'punct', text: m[3] });
  }
  return out;
};

@Component({
  selector: 'app-minirollo-detalle',
  imports: [CommonModule, RouterModule, Navbar, W, Cp],
  providers: [Navigation, Detail],
  templateUrl: './minirollo-detalle.html',
  styleUrl: './minirollo-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // schemas: [NO_ERRORS_SCHEMA],
})
export class MinirolloDetalle {
  doc$!: Observable<DocJson>;
  nav$!: Observable<DetailNav>;
  id$!: Observable<number>;

  private docs = inject(Docs);
  private detail = inject(Detail);
  private zone = inject(NgZone);

  private tokensCache = new Map<number, WordTok[]>();
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    this.id$ = this.detail.buildId$();
    this.doc$ = this.detail.buildDoc$(id => this.docs.getMiniRolloDoc(id)).pipe(shareReplay(1));
    this.nav$ = this.detail.buildNav$(this.id$, p => this.docs.getMiniRolloIndexPageRemote(p));

    // Iniciar observer y reanudar progreso cuando llegue el doc
    this.doc$.pipe(take(1)).subscribe(d => {
      this.tokensCache.clear();
      const did = normalizeDocId(d.id);
      this.initObserver(did);
      this.resumeFromSaved(did);
      this.resumeFromFragment();
    });
  }

  // ---------- Tokenización por bloque ----------
  tokenizeBlock(docId: string | number, block: Block, blockIdx: number): WordTok[] {
    if (this.tokensCache.has(blockIdx)) return this.tokensCache.get(blockIdx)!;

    const acc: WordTok[] = [];
    let wordsInBlock = 0;

    const pushWordId = (arr: WordTok[]) => {
      for (const t of arr) {
        if (t.kind === 'word') {
          t.wordIndexInBlock = wordsInBlock;
          t.wordId = makeWordId(docId, blockIdx, wordsInBlock);
          wordsInBlock++;
        }
      }
    };

    if (block.t === 'p' || block.t === 'blockquote' || block.t === 'code') {
      const inlines = (block as any).inlines as Inline[] | undefined;
      if (inlines?.length) {
        for (const s of inlines) {
          if (s.t === 'text' || s.t === 'strong' || s.t === 'em' || s.t === 'code') {
            const chunk = seg(s.text);
            pushWordId(chunk);
            acc.push(...chunk);
          } else if (s.t === 'link') {
            const chunk = seg(s.text);
            pushWordId(chunk);
            acc.push(...chunk);
          }
        }
      } else if ((block as any).code) {
        const chunk = seg((block as any).code as string);
        pushWordId(chunk);
        acc.push(...chunk);
      }
    } else if (block.t === 'ul' || block.t === 'ol') {
      for (const item of block.items) {
        for (const s of item) {
          const chunk = seg(s.text);
          pushWordId(chunk);
          acc.push(...chunk);
        }
      }
    } else if (block.t === 'img') {
      // sin texto
    }

    this.tokensCache.set(blockIdx, acc);
    return acc;
  }

  // ---------- TrackBy ----------
  trackBlock(i: number, _b: Block) { return i; }
  trackInline(i: number, _s: Inline) { return i; }
  trackInlineArray(i: number, _arr: Inline[]) { return i; }
  trackWord(_i: number, t: WordTok) { return t.wordId ?? _i; }

  // ---------- Progreso ----------
  private lsKey(docId: string | number) { return `reading:minirollo:${normalizeDocId(docId)}`; }

  onWordClick(wordId: string | undefined, docId: string | number, blockIdx?: number) {
    if (!wordId) return;
    const payload = JSON.stringify({ wordId, blockIdx });
    try { localStorage.setItem(this.lsKey(docId), payload); } catch { }
    this.flash(wordId);
  }




resumeFromSaved(docId?: string | number) {
  if (docId == null) return;
  const raw = localStorage.getItem(this.lsKey(docId));
  if (!raw) return;

  try {
    const { wordId } = JSON.parse(raw);

    if (wordId) {
      this.zone.onStable.pipe(take(1)).subscribe(() => {
        requestAnimationFrame(() => {
          const el = document.getElementById(wordId);
          if (el) {
            const rect = el.getBoundingClientRect();
            const y = rect.top + window.scrollY;
            window.scrollTo({ top: y, behavior: 'auto' });
            this.flash(wordId);
          } else {
            console.warn('No encontré el elemento con id', wordId);
          }
        });
      });
    }
  } catch {
    // fallback: ids viejos
    this.scrollToWord(raw, { smooth: false, center: true });
  }
}





  resumeFromFragment() {
    const hash = location.hash || '';
    // Soporta #w=<id> o #w:<id> o directamente #w:...
    const mEq = hash.match(/#w=([^#]+)/i);
    const mColon = hash.match(/#(w:[^#]+)/i);
    const wid = mEq?.[1] ? decodeURIComponent(mEq[1]) : (mColon?.[1] ?? '');
    if (wid) this.scrollToWord(wid, { smooth: true, center: true });
  }

  private scrollToWord(wordId: string, opts: { smooth: boolean; center: boolean }) {
    const el = document.getElementById(wordId);
    if (!el) return;

    // posición absoluta de la palabra en el documento
    const rect = el.getBoundingClientRect();
    const y = rect.top + window.scrollY;

    // opcional: ajustar por navbar fijo o margen superior
    const margin = 20;

    window.scrollTo({
      top: y - margin,
      behavior: opts.smooth ? 'smooth' : 'auto'
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
    const did = normalizeDocId(docId);
    this.observer = new IntersectionObserver((entries) => {
      const vis = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop);
      if (!vis.length) return;
      const topMost = vis[0].target as HTMLElement;
      try { localStorage.setItem(this.lsKey(did), topMost.id); } catch { }
    }, { root: null, rootMargin: '0px', threshold: 0.01 });
  }

  observeCheckpoint(cp: Cp) {
    this.observer?.observe(cp.el.nativeElement);
  }

}
