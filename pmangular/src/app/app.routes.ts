import { Routes } from '@angular/router';
import { NotFound } from './core/not-found/not-found';
import { Root } from './core/root/root';

export const routes: Routes = [
  { 'path': '', component: Root }, // Login si no ha iniciado sesión o home si sí
  { 'path': '**', component: NotFound }
];
