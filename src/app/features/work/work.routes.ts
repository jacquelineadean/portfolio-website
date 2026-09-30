import { Routes } from '@angular/router';

export const workRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./work').then((m) => m.Work),
    title: 'Projects — Jacqueline Dean',
  },
  // The forecaster's page used to live here while it was still in design.
  { path: 'disaster-exposure-modeling', redirectTo: 'readiness-loop' },
  {
    path: ':slug',
    loadComponent: () =>
      import('./components/project-detail/project-detail').then((m) => m.ProjectDetail),
  },
];
