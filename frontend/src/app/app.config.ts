import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode, PLATFORM_ID } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { APP_BASE_HREF, isPlatformBrowser, PlatformLocation } from '@angular/common';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { DOCS } from './doc-viewer/docs.api';
import { Docs } from './doc-viewer/docs';

// import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled', // recuerda la posición
        anchorScrolling: 'enabled'            // permite #anchors
      })
    ),
    provideHttpClient(withFetch()), // HttpClient habilitado globalmente
    {
      provide: APP_BASE_HREF,
      useFactory: (platformId: object, platformLocation: PlatformLocation) => {
        if (isPlatformBrowser(platformId)) {
          return platformLocation.getBaseHrefFromDOM() || "/";
        }
        return (globalThis as any).__APP_BASE_HREF__ ?? "/cienciaceleste/";
      },
      deps: [PLATFORM_ID, PlatformLocation],
    },
    provideClientHydration(withEventReplay()),
    { provide: DOCS, useExisting: Docs },
    // }, provideServiceWorker('ngsw-worker.js', {
    //   //enabled: !isDevMode(),
    //   enabled: false,
    //   registrationStrategy: 'registerImmediately'
    // })
  ]
};
