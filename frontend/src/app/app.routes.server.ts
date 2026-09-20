import { RenderMode, ServerRoute } from '@angular/ssr';
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

function findPublicDir(): string {
  // Buscamos "public" subiendo directorios, porque en prerender a veces el cwd es ".angular/prerender-root"
  let dir = process.cwd();

  for (let i = 0; i < 10; i++) {
    const candA = join(dir, 'public');
    if (existsSync(candA)) return candA;

    const candB = join(dir, 'frontend', 'public');
    if (existsSync(candB)) return candB;

    dir = dirname(dir);
  }

  throw new Error(
    `No encontre la carpeta "public". Probe desde:\n- ${process.cwd()}\n` +
    `Asegurate de tener frontend/public en tu repo.`
  );
}

async function idsFromJsonFiles(dirInsidePublic: string): Promise<string[]> {
  const publicDir = findPublicDir();
  const folder = join(publicDir, dirInsidePublic);

  if (!existsSync(folder)) {
    throw new Error(`No existe la carpeta: ${folder}`);
  }

  const entries = await readdir(folder, { withFileTypes: true });

  const ids = entries
    .filter((e) => e.isFile() && /^\d+\.json$/.test(e.name))
    .map((e) => e.name.replace(/\.json$/, ''));

  // orden numerico
  ids.sort((a, b) => Number(a) - Number(b));

  if (ids.length === 0) {
    throw new Error(`No encontre archivos "*.json" numericos en: ${folder}`);
  }

  return ids;
}

// Cache para no escanear directorios varias veces
let rolloDocIdsPromise: Promise<string[]> | null = null;
let miniDocIdsPromise: Promise<string[]> | null = null;

let rolloIndexPagesPromise: Promise<string[]> | null = null;
let miniIndexPagesPromise: Promise<string[]> | null = null;
let leyesIndexPagesPromise: Promise<string[]> | null = null;

// Detalles (documentos)
function getRolloDocIds() {
  return (rolloDocIdsPromise ??= idsFromJsonFiles(join('docs', 'rollo')));
}

function getMiniRolloDocIds() {
  return (miniDocIdsPromise ??= idsFromJsonFiles(join('docs', 'divino-minirollo')));
}

// Listados (paginas de indice)
function getRolloIndexPageIds() {
  return (rolloIndexPagesPromise ??= idsFromJsonFiles(join('docs', 'rollo', 'index', 'pages')));
}

function getMiniRolloIndexPageIds() {
  return (miniIndexPagesPromise ??= idsFromJsonFiles(join('docs', 'divino-minirollo', 'index', 'pages')));
}

function getLeyIndexPageIds() {
  return (leyesIndexPagesPromise ??= idsFromJsonFiles(join('docs', 'divinas-leyes', 'index', 'pages')));
}

export const serverRoutes: ServerRoute[] = [
  // home
  { path: '', renderMode: RenderMode.Prerender },

  // rutas sin :id (redirects a /1). Las podes prerenderizar igual.
  { path: 'divinos-rollos', renderMode: RenderMode.Prerender },
  { path: 'divinos-minirollos', renderMode: RenderMode.Prerender },
  { path: 'divinas-leyes', renderMode: RenderMode.Prerender },

  // LISTADOS (page = :id) -> salen de index/pages/*.json
  {
    path: 'divinos-rollos/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => (await getRolloIndexPageIds()).map((id) => ({ id })),
  },
  {
    path: 'divinos-minirollos/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => (await getMiniRolloIndexPageIds()).map((id) => ({ id })),
  },
  {
    path: 'divinas-leyes/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => (await getLeyIndexPageIds()).map((id) => ({ id })),
  },

  // DETALLES -> salen de docs/<categoria>/*.json
  {
    path: 'divino-rollo/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => (await getRolloDocIds()).map((id) => ({ id })),
  },
  {
    path: 'divino-minirollo/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => (await getMiniRolloDocIds()).map((id) => ({ id })),
  },

  { path: 'doc-viewer/:kind/:id', renderMode: RenderMode.Client },

  // wildcard: infinito -> Client
  { path: '**', renderMode: RenderMode.Client },
];