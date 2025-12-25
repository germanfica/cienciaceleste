import { Injectable, Inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { Title } from "@angular/platform-browser";
import { TitleStrategy, RouterStateSnapshot } from "@angular/router";

@Injectable()
export class AppTitleStrategy extends TitleStrategy {
  private first = true;

  private readonly genericDetailTitles = new Set([
    "Divinos Rollos Telepáticos - Detalle",
    "Divinos Mini Rollos Telepáticos - Detalle",
    "Doc Viewer - Detalle",
  ]);

  constructor(
    private readonly title: Title,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    super();
  }

  override updateTitle(routerState: RouterStateSnapshot): void {
    const next = this.buildTitle(routerState);
    if (!next) return;

    if (this.first && isPlatformBrowser(this.platformId)) {
      this.first = false;

      const current = this.title.getTitle();
      if (this.genericDetailTitles.has(next) && current && current !== next) {
        return;
      }
    } else {
      this.first = false;
    }

    this.title.setTitle(next);
  }
}
