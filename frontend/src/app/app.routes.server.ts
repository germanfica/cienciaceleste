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
let rolloIdsPromise: Promise<string[]> | null = null;
let miniIdsPromise: Promise<string[]> | null = null;

function getRolloIds() {
  return (rolloIdsPromise ??= idsFromJsonFiles(join('docs', 'rollo')));
}

function getMiniRolloIds() {
  return (miniIdsPromise ??= idsFromJsonFiles(join('docs', 'divino-minirollo')));
}

export const serverRoutes: ServerRoute[] = [
  // estaticas
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'divinos-rollos', renderMode: RenderMode.Prerender },
  { path: 'divinos-minirollos', renderMode: RenderMode.Prerender },
  { path: 'divinas-leyes', renderMode: RenderMode.Prerender },

  // dinamicas: prerender de todos los elementos
  {
    path: 'divinos-rollos/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => (await getRolloIds()).map((id) => ({ id })),
  },
  {
    path: 'divinos-minirollos/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => (await getMiniRolloIds()).map((id) => ({ id })),
  },

  { path: 'doc-viewer/:kind/:id', renderMode: RenderMode.Client },

  // wildcard: infinito -> Client
  { path: '**', renderMode: RenderMode.Client },
];