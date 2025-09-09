import { Injectable } from '@angular/core';
import { Block, Inline } from './md-types';

export type TokKind = 'word' | 'space' | 'punct';
export type WordTok = { kind: TokKind; text: string; wordIndexInBlock?: number; wordId?: string };

@Injectable()
export class Tokenizer {
  private tokensCache = new Map<number, WordTok[]>();

  private toB36(n: number) { return n.toString(36); }

  private hashStringToInt(s: string): number {
    let h = 2166136261 >>> 0; // FNV-1a
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h & 0x7fffffff) % 2147483647;
  }

  private normalizeDocId(id: string | number): number {
    if (typeof id === 'number') return id;
    const n = Number(id);
    return Number.isFinite(n) ? n : this.hashStringToInt(id);
  }

  private makeWordId(docId: string | number, blockIdx: number, wordIdxInBlock: number): string {
    const did = this.normalizeDocId(docId);
    return `w:${this.toB36(did)}.${this.toB36(blockIdx)}.${this.toB36(wordIdxInBlock)}`;
  }

  private segment(text: string): WordTok[] {
    const SegCtor = (globalThis as any).Intl?.Segmenter as
      | (new (locale?: string | string[], options?: { granularity?: 'grapheme' | 'word' | 'sentence' }) => Intl.Segmenter)
      | undefined;

    if (SegCtor) {
      const S = new SegCtor(undefined, { granularity: 'word' });
      const out: WordTok[] = [];
      let lastEnd = 0;
      // @ts-ignore: TS no conoce bien el iterador de Segments
      for (const { segment, isWordLike, index } of S.segment(text)) {
        if (index > lastEnd) {
          const gap = text.slice(lastEnd, index);
          for (const ch of gap) out.push({ kind: /\s/.test(ch) ? 'space' : 'punct', text: ch });
        }
        if (isWordLike) out.push({ kind: 'word', text: segment });
        else out.push({ kind: /\s/.test(segment) ? 'space' : 'punct', text: segment });
        lastEnd = index + segment.length;
      }
      if (lastEnd < text.length) {
        const tail = text.slice(lastEnd);
        for (const ch of tail) out.push({ kind: /\s/.test(ch) ? 'space' : 'punct', text: ch });
      }
      return out;
    }

    // Fallback regex
    const re = /(\p{L}[\p{L}\p{Mn}\p{Nd}\p{Pc}]*)|(\s+)|([^\s\p{L}\p{Mn}\p{Nd}\p{Pc}])/gu;
    const out: WordTok[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (m[1]) out.push({ kind: 'word', text: m[1] });
      else if (m[2]) out.push({ kind: 'space', text: m[2] });
      else if (m[3]) out.push({ kind: 'punct', text: m[3] });
    }
    return out;
  }

  tokenizeBlock(docId: string | number, block: Block, blockIdx: number): WordTok[] {
    if (this.tokensCache.has(blockIdx)) return this.tokensCache.get(blockIdx)!;

    const acc: WordTok[] = [];
    let wordsInBlock = 0;

    const pushWordId = (arr: WordTok[]) => {
      for (const t of arr) {
        if (t.kind === 'word') {
          t.wordIndexInBlock = wordsInBlock;
          t.wordId = this.makeWordId(docId, blockIdx, wordsInBlock);
          wordsInBlock++;
        }
      }
    };

    if (block.t === 'p' || block.t === 'blockquote' || block.t === 'code') {
      const inlines = (block as any).inlines as Inline[] | undefined;
      if (inlines?.length) {
        for (const s of inlines) {
          if (['text', 'strong', 'em', 'code', 'link'].includes(s.t)) {
            const chunk = this.segment(s.text);
            pushWordId(chunk);
            acc.push(...chunk);
          }
        }
      } else if ((block as any).code) {
        const chunk = this.segment((block as any).code as string);
        pushWordId(chunk);
        acc.push(...chunk);
      }
    } else if (block.t === 'ul' || block.t === 'ol') {
      for (const item of block.items) {
        for (const s of item) {
          const chunk = this.segment(s.text);
          pushWordId(chunk);
          acc.push(...chunk);
        }
      }
    }

    this.tokensCache.set(blockIdx, acc);
    return acc;
  }

  clearCache() {
    this.tokensCache.clear();
  }
}
