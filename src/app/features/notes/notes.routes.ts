import { Routes } from '@angular/router';

export const notesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./notes').then((m) => m.Notes),
    title: 'Notes — Jacqueline Dean',
  },
  {
    path: ':slug',
    loadComponent: () => import('./components/post-detail/post-detail').then((m) => m.PostDetail),
  },
];
