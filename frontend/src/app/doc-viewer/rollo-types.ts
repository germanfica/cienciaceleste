// rollo-types.ts
export interface RolloIndexRow {
  id: number;
  titulo: string;
  autor: string;
}
export interface RolloIndexRowRaw {
  id: string;     // viene como string en tu JSON
  titulo: string;
  autor: string;
}
export interface RolloIndexPage {
  page: number;
  pageSize: number;
  range: { start: number; end: number }; // IDs esperados de la página (1–10, 11–20, …)
  items: RolloIndexRow[];                // solo los que existen
  hasPrev: boolean;
  hasNext: boolean;
  totalIds: number;                      // max ID visto (p.ej. 263)
  totalPages: number;                    // ceil(maxId / pageSize)
}
