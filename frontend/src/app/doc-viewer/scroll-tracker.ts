// src/app/doc-viewer/scroll-tracker.ts
import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';
import { ScrollProgress, TrackOptions } from './scroll-progress';

@Directive({
  selector: '[scrollTracker]',
  standalone: true
})
export class ScrollTracker implements OnInit, OnDestroy {
  @Input({ required: true }) scrollProgress!: string; // clave, ej 'doc/123'
  @Input() scrollProgressVersion?: string;
  @Input() scrollProgressSaveEveryMs = 200;
  @Input() scrollProgressBehavior: ScrollBehavior = 'auto';

  constructor(private el: ElementRef<HTMLElement>, private sp: ScrollProgress) { }

  ngOnInit(): void {
    const opts: TrackOptions = {
      key: this.scrollProgress,
      target: document.documentElement, // this.el.nativeElement,
      saveEveryMs: this.scrollProgressSaveEveryMs,
      restoreBehavior: this.scrollProgressBehavior,
      version: this.scrollProgressVersion
    };
    this.sp.startTracking(opts);
  }

  ngOnDestroy(): void {
    this.sp.stop();
  }
}
