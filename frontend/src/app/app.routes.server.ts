import { RenderMode, ServerRoute } from '@angular/ssr';
import fs from 'fs';
import path from 'path';

/**
 * Helper to collect JSON IDs from a folder with optional max length.
 * Only returns IDs that exist as .json files and are <= maxLength (if provided).
 */
function _collectJsonIds(folder: string, maxLength?: number): { id: string }[] {
  const docsDir = path.join(process.cwd(), folder);
  if (!fs.existsSync(docsDir)) return [];

  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.json'));
  const ids = files.map(f => parseInt(f.replace('.json', ''), 10)).filter(n => !isNaN(n));

  const filtered = maxLength ? ids.filter(id => id <= maxLength) : ids;
  return filtered.map(id => ({ id: String(id) }));
}

/**
 * Helper to collect pagination pages (page=1, page=2, …).
 */
function _collectPages(folder: string, maxLength?: number): { page: string }[] {
  const docsDir = path.join(process.cwd(), folder);
  if (!fs.existsSync(docsDir)) return [];

  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.json'));
  // Busca `page-<N>.json`
  const pages = files
    .map(f => {
      const match = f.match(/page-(\d+)\.json$/);
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter(n => !isNaN(n));

  const filtered = maxLength ? pages.filter(p => p <= maxLength) : pages;
  return filtered.map(p => ({ page: String(p) }));
}

export const serverRoutes: ServerRoute[] = [
  // Home
  { path: '', renderMode: RenderMode.Prerender },

  // Listados base
  { path: 'divinos-rollos', renderMode: RenderMode.Prerender },
  { path: 'divinos-minirollos', renderMode: RenderMode.Prerender },
  { path: 'divinas-leyes', renderMode: RenderMode.Prerender },

  // Rollos dinámicos
  {
    path: 'divinos-rollos/:id',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return _collectJsonIds('public/docs/rollo', 300);
    },
  },
  // Rollos paginados
  // {
  //   path: 'divinos-rollos/page/:page',
  //   renderMode: RenderMode.Prerender,
  //   async getPrerenderParams() {
  //     return _collectPages('public/docs/rollo/index/pages', 50);
  //   },
  // },

  // Minirollos dinámicos
  {
    path: 'divinos-minirollos/:id',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return _collectJsonIds('public/docs/minirollo', 30);
    },
  },
  // Minirollos paginados
  // {
  //   path: 'divinos-minirollos/page/:page',
  //   renderMode: RenderMode.Prerender,
  //   async getPrerenderParams() {
  //     return _collectPages('public/docs/minirollo/index/pages', 10);
  //   },
  // },

  // Divinas leyes paginadas
  // {
  //   path: 'divinas-leyes/page/:page',
  //   renderMode: RenderMode.Prerender,
  //   async getPrerenderParams() {
  //     return _collectPages('public/docs/ley/index/pages', 20);
  //   },
  // },

  // Doc viewer dinámico
  {
    path: 'doc-viewer/:id',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return _collectJsonIds('public/docs/doc-viewer');
    },
  },

  // Catch-all (ej: 404)
  { path: '**', renderMode: RenderMode.Prerender },
];
