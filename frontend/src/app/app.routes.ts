import { Routes } from '@angular/router';
import { Home } from "./home/home";
import { Rollos } from "./rollo/rollos/rollos";
import { RolloDetalle } from './rollo/rollo-detalle/rollo-detalle';
import { DocViewer } from './doc-viewer/doc-viewer';
import { Minirollos } from './minirollo/minirollos/minirollos';
import { MinirolloDetalle } from './minirollo/minirollo-detalle/minirollo-detalle';
import { DivinasLeyes } from './ley/divinas-leyes/divinas-leyes';
import { Editor } from './admin/editor/editor';
import { AdminRollos } from './admin/admin-rollos/admin-rollos';
import { AdminMinirollos } from './admin/admin-minirollos/admin-minirollos';

export const routes: Routes = [
  { path: "", component: Home, title: "Divinos Rollos Telepáticos - Inicio" },
  { path: "divinos-rollos", component: Rollos, title: "Divinos Rollos Telepáticos - Listado" },
  { path: "divinos-minirollos", component: Minirollos, title: "Divinos Mini Rollos Telepáticos - Listado" },
  { path: "divinas-leyes", component: DivinasLeyes, title: "Divinas Leyes - Listado" },
  { path: "divinos-rollos/:id", component: Rollos, title: "Divinos Rollos Telepáticos - Listado" },
  { path: "divino-rollo/:id", component: RolloDetalle, title: "Divino Rollo Telepático" },
  { path: "divinos-minirollos/:id", component: Minirollos, title: "Divinos Mini Rollos Telepáticos - Listado" },
  { path: "divino-minirollo/:id", component: MinirolloDetalle, title: "Divino Mini Rollo Telepático" },
  { path: "divinas-leyes/:id", component: DivinasLeyes, title: "Divinas Leyes - Listado" },
  { path: "doc-viewer/:kind/:id", component: DocViewer, title: "Doc Viewer - Detalle" },
  { path: "editor", component: Editor, title: "Editor" },
  { path: "admin/divinos-rollos", component: AdminRollos, title: "Admin Divinos Rollos" },
  { path: "admin/divinos-rollos/:id", component: AdminRollos, title: "Admin Divinos Rollos" },
  { path: "admin/divino-rollo/:id", component: Editor, title: "Editor", data: { documentType: "rollo" } },
  { path: "admin/divinos-minirollos", component: AdminMinirollos, title: "Admin Divinos Minirollos" },
  { path: "admin/divinos-minirollos/:id", component: AdminMinirollos, title: "Admin Divinos Minirollos" },
  { path: "admin/divino-minirollo/:id", component: Editor, title: "Editor", data: { documentType: "minirollo" } },
  { path: "**", redirectTo: "" }
];
