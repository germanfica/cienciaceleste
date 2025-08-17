import { Routes } from '@angular/router';
import { Home } from "./pages/home/home";
import { Rollos } from "./pages/rollos/rollos";

export const routes: Routes = [
  { path: "", component: Home, title: "Divinos Rollos Telepáticos - Inicio" },
  { path: "rollos", component: Rollos, title: "Divinos Rollos Telepáticos - Listado" },
  { path: "**", redirectTo: "" }
];