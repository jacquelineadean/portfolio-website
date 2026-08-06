import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
    title: 'Jacqueline Dean — Senior Software Engineer',
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about/about').then((m) => m.About),
    title: 'About — Jacqueline Dean',
  },
  {
    path: 'work',
    loadChildren: () => import('./features/work/work.routes').then((m) => m.workRoutes),
  },
  {
    path: 'notes',
    loadChildren: () => import('./features/notes/notes.routes').then((m) => m.notesRoutes),
  },
  // Writing and Reading were separate sections; they are one now. Keep the old
  // paths resolving so existing links to individual posts do not break.
  { path: 'writing', pathMatch: 'full', redirectTo: 'notes' },
  { path: 'writing/:slug', redirectTo: 'notes/:slug' },
  { path: 'reading', pathMatch: 'full', redirectTo: 'notes' },
  {
    path: '**',
    redirectTo: '',
  },
];
