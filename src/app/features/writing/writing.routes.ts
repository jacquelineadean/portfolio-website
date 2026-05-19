import { Routes } from '@angular/router';

export const writingRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./writing').then((m) => m.Writing),
    title: 'Writing — Jacqueline Dean',
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./components/post-detail/post-detail').then((m) => m.PostDetail),
  },
];
