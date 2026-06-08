import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'join',
  },
  {
    path: 'join',
    title: 'Join a Room · DrawWithMe',
    loadComponent: () => import('./features/lobby/join-room/join-room').then((m) => m.JoinRoom),
  },
  {
    path: 'room/:code',
    title: 'Drawing Room · DrawWithMe',
    loadComponent: () => import('./features/room/drawing-room/drawing-room').then((m) => m.DrawingRoom),
  },
  {
    path: 'artwork/:id',
    title: 'Final Artwork · DrawWithMe',
    loadComponent: () =>
      import('./features/review/review-artwork/review-artwork').then((m) => m.ReviewArtwork),
  },
  {
    path: '**',
    redirectTo: 'join',
  },
];
