// src/app/doc-viewer/scroll-progress.ts
import { Injectable, Inject, NgZone, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Observable, Subscription, fromEvent } from 'rxjs';
import { auditTime, map } from 'rxjs/operators';

type ScrollTarget = Window | HTMLElement;

interface PersistedProgress {
  y: number;               // scrollTop absoluto
  ratio: number;           // y / maxScrollable
  scrollH: number;         // scrollHeight previo (para heurística de restauración)
  viewportH: number;       // alto de viewport previo
  ts: number;              // timestamp de guardado
  version?: string;        // opcional por si querés invalidar
}

export interface TrackOptions {
  key: string;                    // clave única: ej 'rollo/123'
  target?: ScrollTarget;          // window por default
  saveEveryMs?: number;           // guarda con auditTime, default 200ms
  restoreBehavior?: ScrollBehavior; // 'auto' o 'smooth' (default 'auto')
  version?: string;               // para invalidar posiciones viejas si cambió el contenido
}

@Injectable({ providedIn: 'root' })
export class ScrollProgress {
  private sub: Subscription | null = null;
  private currentKey: string | null = null;
  private currentTarget: ScrollTarget | null = null;

  constructor(
    @Inject(DOCUMENT) private readonly doc: Document,
    @Inject(PLATFORM_ID) private readonly platformId: object,
    private readonly zone: NgZone
  ) { }

  /** Inicia el tracking. Idempotente: si cambia la key o el target, se reinicia. */
  startTracking(opts: TrackOptions): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const target = opts.target ?? window;
    const key = this.storageKey(opts.key);

    // Si ya estamos trackeando otra cosa, paramos.
    if (this.sub) this.stop();

    this.currentKey = key;
    this.currentTarget = target;

    // 1) Restaurar después de render (con requestAnimationFrame)
    requestAnimationFrame(() => {
      this.restore({
        key: opts.key,
        target,
        behavior: opts.restoreBehavior ?? 'auto',
        version: opts.version
      });
    });

    // 2) Enganchar listeners (scroll + 'pagehide'/'visibilitychange')
    this.zone.runOutsideAngular(() => {
      const saveEveryMs = Number.isFinite(opts.saveEveryMs) ? Math.max(0, opts.saveEveryMs!) : 200;

      const scroll$: Observable<void> = (target === window)
        ? fromEvent(window, 'scroll', { passive: true }).pipe(map(() => void 0))
        : fromEvent(target as HTMLElement, 'scroll', { passive: true }).pipe(map(() => void 0));

      const sub = new Subscription();

      // Throttle/audit con raf-like (auditTime es suficiente y barato)
      sub.add(
        scroll$.pipe(auditTime(saveEveryMs)).subscribe(() => {
          this.saveProgress(key, target, opts.version);
        })
      );

      // Guardas extra por si el usuario cierra o cambia de pestaña
      sub.add(fromEvent(window, 'pagehide').subscribe(() => this.saveProgress(key, target, opts.version)));
      sub.add(fromEvent(document, 'visibilitychange').subscribe(() => {
        if (document.visibilityState === 'hidden') this.saveProgress(key, target, opts.version);
      }));

      // --- OPCIÓN A + B ---
      // A) Confiamos en que el navegador restaure scroll automáticamente con BFCache
      // B) Pero también guardamos al navegar atrás/adelante para tener consistencia en localStorage
      sub.add(fromEvent(window, 'beforeunload').subscribe(() => this.saveProgress(key, target, opts.version)));
      sub.add(fromEvent(window, 'popstate').subscribe(() => this.saveProgress(key, target, opts.version)));

      this.sub = sub;
    });
  }

  /** Detiene el tracking actual. */
  stop(): void {
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = null;
    }
    this.currentKey = null;
    this.currentTarget = null;
  }

  /** Limpia el progreso guardado para una clave. */
  clear(key: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.removeItem(this.storageKey(key));
    } catch { /* noop */ }
  }

  /** Fuerza un guardado manual (si ya hay target/clave activos). */
  saveNow(): void {
    if (!this.currentKey || !this.currentTarget) return;
    this.saveProgress(this.currentKey, this.currentTarget, undefined);
  }

  /** Restaura la posición desde storage. Devuelve true si restauró algo. */
  restore(params: { key: string; target?: ScrollTarget; behavior?: ScrollBehavior; version?: string }): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;

    const key = this.storageKey(params.key);
    const target = params.target ?? window;
    const behavior = params.behavior ?? 'auto';

    const data = this.readProgress(key);
    if (!data) return false;
    if (params.version && data.version && params.version !== data.version) return false; // invalidado por versión

    // Medidas actuales
    const { maxScrollable, viewportH } = this.measure(target);
    if (maxScrollable <= 0) return false;

    // Heurística de restauración:
    // - si la diferencia de alturas es grande, preferir ratio.
    // - si es parecida, usar px exactos.
    const heightDelta = Math.abs((data.scrollH - viewportH) - (maxScrollable));
    const heightChangedMuch = heightDelta > Math.max(256, 0.1 * (maxScrollable + viewportH));

    const byRatio = Math.max(0, Math.min(1, data.ratio));
    const targetYByRatio = Math.round(byRatio * maxScrollable);
    const targetY = heightChangedMuch ? targetYByRatio : Math.min(data.y, maxScrollable);

    this.scrollTo(target, targetY, behavior);
    return true;
  }

  // ---- privados ----

  private storageKey(key: string): string {
    return `reading-progress:${key}`;
  }

  private readProgress(key: string): PersistedProgress | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw) as PersistedProgress;
      // Validación básica
      if (typeof obj.y !== 'number' || typeof obj.ratio !== 'number') return null;
      return obj;
    } catch {
      return null;
    }
  }

  private saveProgress(key: string, target: ScrollTarget, version?: string): void {
    try {
      const { y, maxScrollable, viewportH } = this.measure(target);
      const ratio = maxScrollable > 0 ? y / maxScrollable : 0;
      const data: PersistedProgress = {
        y,
        ratio: isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0,
        scrollH: maxScrollable,
        viewportH,
        ts: Date.now(),
        version
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // localStorage deshabilitado o cuota llena -> ignorar silenciosamente
    }
  }

  private measure(target: ScrollTarget): { y: number; maxScrollable: number; viewportH: number } {
    if (target === window) {
      const docEl = this.doc.scrollingElement || this.doc.documentElement;
      const scrollH = docEl ? docEl.scrollHeight : 0;
      const innerH = window.innerHeight || 0;
      const y = window.scrollY || 0;
      return { y, maxScrollable: Math.max(0, scrollH - innerH), viewportH: innerH };
    } else {
      const el = target as HTMLElement;
      const y = el.scrollTop;
      return { y, maxScrollable: Math.max(0, el.scrollHeight - el.clientHeight), viewportH: el.clientHeight };
    }
  }

  private scrollTo(target: ScrollTarget, top: number, behavior: ScrollBehavior): void {
    if (target === window) {
      window.scrollTo({ top, behavior });
    } else {
      (target as HTMLElement).scrollTo({ top, behavior });
    }
  }
}
