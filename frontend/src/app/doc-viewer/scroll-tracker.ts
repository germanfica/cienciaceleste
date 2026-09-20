// src/app/doc-viewer/scroll-tracker.ts
import { isPlatformBrowser } from '@angular/common';
import {
  Directive,
  DOCUMENT,
  ElementRef,
  inject,
  Input,
  OnDestroy,
  OnInit,
  PLATFORM_ID
} from '@angular/core';
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

  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  constructor(private el: ElementRef<HTMLElement>, private sp: ScrollProgress) { }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const opts: TrackOptions = {
      key: this.scrollProgress,
      target: this.document.documentElement, // this.el.nativeElement,
      saveEveryMs: this.scrollProgressSaveEveryMs,
      restoreBehavior: this.scrollProgressBehavior,
      version: this.scrollProgressVersion
    };

    this.sp.startTracking(opts);
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.sp.stop();
    }
  }
}