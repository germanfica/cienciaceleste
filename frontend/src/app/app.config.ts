import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { APP_BASE_HREF, PlatformLocation } from '@angular/common';
// import { provideServiceWorker } from '@angular/service-worker';
import { DOCS } from './doc-viewer/docs.api';
import { Docs } from './doc-viewer/docs';

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
    provideClientHydration(withEventReplay()),
    {
      provide: APP_BASE_HREF,
      useFactory: (platformLocation: PlatformLocation) =>
        platformLocation.getBaseHrefFromDOM(),
      deps: [PlatformLocation]
    },
    { provide: DOCS, useExisting: Docs },
    // }, provideServiceWorker('ngsw-worker.js', {
    //   //enabled: !isDevMode(),
    //   enabled: false,
    //   registrationStrategy: 'registerImmediately'
    // })
  ]
};
