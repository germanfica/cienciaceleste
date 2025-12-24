import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { Docs } from './doc-viewer/docs';
import { DocsServer } from './doc-viewer/docs.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: Docs, useClass: DocsServer },
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
