import { Routes } from '@angular/router';

export const workRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./work').then((m) => m.Work),
    title: 'Projects — Jacqueline Dean',
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./components/project-detail/project-detail').then((m) => m.ProjectDetail),
  },
];
