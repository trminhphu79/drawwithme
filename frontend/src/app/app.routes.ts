import { Routes } from '@angular/router';
import { leaveRoomGuard } from './features/room/leave-room.guard';

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
    canDeactivate: [leaveRoomGuard],
  },
  {
    path: 'artwork/:id',
    title: 'Final Artwork · DrawWithMe',
    loadComponent: () =>
      import('./features/review/review-artwork/review-artwork').then((m) => m.ReviewArtwork),
  },
  {
    // Public, shareable view — no "Back to room" (visitor isn't a participant).
    path: 'view/:id',
    title: 'Artwork · DrawWithMe',
    data: { publicView: true },
    loadComponent: () =>
      import('./features/review/review-artwork/review-artwork').then((m) => m.ReviewArtwork),
  },
  {
    path: '**',
    redirectTo: 'join',
  },
];
