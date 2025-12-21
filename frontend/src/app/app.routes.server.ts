import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Home ("/")
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },

  // Rutas estaticas (sin params) que queres prerenderizar
  {
    path: 'divinos-rollos',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'divinos-minirollos',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'divinas-leyes',
    renderMode: RenderMode.Prerender,
  },

  // Rutas con params: NO prerender (evita pedir getPrerenderParams)
  {
    path: 'divinos-rollos/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'divinos-minirollos/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'doc-viewer/:id',
    renderMode: RenderMode.Client,
  },

  // Catch-all para cualquier otra ruta (incluye "**" de tu router)
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
