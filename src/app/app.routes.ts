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
    path: 'writing',
    loadChildren: () => import('./features/writing/writing.routes').then((m) => m.writingRoutes),
  },
  {
    path: 'reading',
    loadComponent: () => import('./features/reading/reading').then((m) => m.Reading),
    title: 'Reading — Jacqueline Dean',
  },
  {
    path: 'resume',
    loadComponent: () => import('./features/resume/resume').then((m) => m.Resume),
    title: 'Resume — Jacqueline Dean',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
