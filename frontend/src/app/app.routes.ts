import { Routes } from '@angular/router';
import { Home } from "./pages/home/home";
import { Rollos } from "./pages/rollos/rollos";
import { RolloDetalle } from './pages/rollo-detalle/rollo-detalle';
import { DocViewer } from './doc-viewer/doc-viewer';

export const routes: Routes = [
  { path: "", component: Home, title: "Divinos Rollos Telepáticos - Inicio" },
  { path: "rollos", component: Rollos, title: "Divinos Rollos Telepáticos - Listado" },
  { path: "rollos/:id", component: RolloDetalle, title: "Divinos Rollos Telepáticos - Detalle" },
  { path: "doc-viewer/:id", component: DocViewer, title: "Divinos Rollos Telepáticos - Detalle" },
  { path: "**", redirectTo: "" }
];