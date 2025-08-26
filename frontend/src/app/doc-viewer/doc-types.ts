// doc-types.ts
export interface DocIndexRow {
  id: number;
  titulo: string;
  autor: string;
}
export interface DocIndexRowRaw {
  id: string;     // viene como string en tu JSON
  titulo: string;
  autor: string;
}
export interface DocIndexPage {
  page: number;
  pageSize: number;
  range: { start: number; end: number }; // IDs esperados de la página (1–10, 11–20, …)
  items: DocIndexRow[];                // solo los que existen
  hasPrev: boolean;
  hasNext: boolean;
  totalIds: number;                      // max ID visto (p.ej. 263)
  totalPages: number;                    // ceil(maxId / pageSize)
}
export type DetailNav = {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  prevId: number; // 0 cuando no hay anterior
  nextId: number; // 0 cuando no hay siguiente
};