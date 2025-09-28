import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { APP_BASE_HREF, PlatformLocation } from '@angular/common';
// import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
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
      useFactory: (platformLocation: PlatformLocation) =>
        platformLocation.getBaseHrefFromDOM(),
      deps: [PlatformLocation]
    }
    // }, provideServiceWorker('ngsw-worker.js', {
    //   //enabled: !isDevMode(),
    //   enabled: false,
    //   registrationStrategy: 'registerImmediately'
    // })
  ]
};
