import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';

type AdminSection = 'leyes' | 'rollos' | 'minirollos';

@Component({
  selector: 'app-admin-topbar',
  imports: [RouterModule],
  templateUrl: './admin-topbar.html',
  styleUrl: './admin-topbar.scss',
})
export class AdminTopbar {
  readonly openSection = signal<AdminSection | null>(null);
  readonly isMobile = signal(window.matchMedia('(max-width: 680px)').matches);

  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  readonly activeSection = computed<AdminSection | null>(() => {
    const url = this.currentUrl();

    if (url.startsWith('/admin/divinas-leyes') || url.startsWith('/admin/divina-ley/')) {
      return 'leyes';
    }

    if (url.startsWith('/admin/divinos-rollos') || url.startsWith('/admin/divino-rollo/')) {
      return 'rollos';
    }

    if (url.startsWith('/admin/divinos-minirollos') || url.startsWith('/admin/divino-minirollo/')) {
      return 'minirollos';
    }

    return null;
  });

  toggleSection(event: MouseEvent, section: AdminSection): void {
    event.stopPropagation();

    if (this.isMobile()) {
      return;
    }

    if (window.matchMedia('(hover: hover)').matches) {
      this.openSection.set(section);
      return;
    }

    this.openSection.update(current => current === section ? null : section);
  }

  openMenu(section: AdminSection): void {
    if (this.isMobile()) {
      return;
    }

    this.openSection.set(section);
  }

  closeMenuFromFocus(event: FocusEvent): void {
    const menu = event.currentTarget as HTMLElement;
    const nextElement = event.relatedTarget as Node | null;

    if (!nextElement || !menu.contains(nextElement)) {
      this.closeMenu();
    }
  }

  closeMenu(): void {
    this.openSection.set(null);
  }

  @HostListener('document:click')
  closeMenuFromOutside(): void {
    this.closeMenu();
  }

  @HostListener('window:resize')
  updateViewportMode(): void {
    this.isMobile.set(window.matchMedia('(max-width: 680px)').matches);
  }
}
