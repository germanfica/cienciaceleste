import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { DocsServer } from './doc-viewer/docs.server';
import { DOCS } from './doc-viewer/docs.api';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: DOCS, useClass: DocsServer },
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
