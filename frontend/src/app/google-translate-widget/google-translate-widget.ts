import { Component, Inject, PLATFORM_ID, AfterViewInit } from "@angular/core";
import { DOCUMENT, isPlatformBrowser } from "@angular/common";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

@Component({
  selector: "app-google-translate-widget",
  standalone: true,
  template: `<div id="google_translate_element"></div>`,
})
export class GoogleTranslateWidget implements AfterViewInit {
  private static scriptLoaded = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(DOCUMENT) private doc: Document
  ) { }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    window.googleTranslateElementInit = () => {
      const g = window.google;
      if (!g?.translate?.TranslateElement) return;

      // Se evita recrearlo si ya existe
      const host = this.doc.getElementById("google_translate_element");
      if (!host) return;

      host.innerHTML = "";
      new g.translate.TranslateElement(
        { pageLanguage: "es", autoDisplay: false },
        "google_translate_element"
      );
    };

    // Cargar el script una sola vez
    if (GoogleTranslateWidget.scriptLoaded) {
      window.googleTranslateElementInit?.();
      return;
    }

    const s = this.doc.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    this.doc.body.appendChild(s);

    GoogleTranslateWidget.scriptLoaded = true;
  }
}
