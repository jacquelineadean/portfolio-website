import { Routes } from '@angular/router';

export const notesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./notes').then((m) => m.Notes),
    title: 'Notes — Jacqueline Dean',
  },
  // An interactive post renders its own component in place of markdown. Its
  // listing metadata still comes from src/content/blog/<slug>.md.
  {
    path: 'four-mental-models-illustrated',
    loadComponent: () =>
      import('./posts/four-mental-models/four-mental-models').then((m) => m.FourMentalModels),
  },
  {
    path: ':slug',
    loadComponent: () => import('./components/post-detail/post-detail').then((m) => m.PostDetail),
  },
];
