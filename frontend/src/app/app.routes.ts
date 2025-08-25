import { Routes } from '@angular/router';
import { Home } from "./home/home";
import { Rollos } from "./rollo/rollos/rollos";
import { RolloDetalle } from './rollo/rollo-detalle/rollo-detalle';
import { DocViewer } from './doc-viewer/doc-viewer';

export const routes: Routes = [
  { path: "", component: Home, title: "Divinos Rollos Telepáticos - Inicio" },
  { path: "rollos", component: Rollos, title: "Divinos Rollos Telepáticos - Listado" },
  { path: "rollos/:id", component: RolloDetalle, title: "Divinos Rollos Telepáticos - Detalle" },
  { path: "doc-viewer/:id", component: DocViewer, title: "Divinos Rollos Telepáticos - Detalle" },
  { path: "**", redirectTo: "" }
];