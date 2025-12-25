import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { DocsServer } from './doc-viewer/docs.server';
import { DOCS } from './doc-viewer/docs.api';
import { TitleStrategy } from '@angular/router';
import { AppTitleStrategy } from './app-title.strategy';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: DOCS, useClass: DocsServer },
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
