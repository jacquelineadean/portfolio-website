import { Routes } from '@angular/router';

export const workRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./work').then((m) => m.Work),
    title: 'Work — Jacqueline Dean',
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./components/case-study-detail/case-study-detail').then((m) => m.CaseStudyDetail),
  },
];
