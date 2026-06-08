# DrawWithMe

A private, real-time collaborative drawing platform. Multiple people join a room
by code and draw together on a shared canvas; sessions can be sealed and revisited
as a finished artwork.

- **Frontend:** Angular 22 (zoneless, standalone, signals) + Tailwind v4. Warm
  "Earth & Ethos" design system. Smart/dumb components + per-feature signal stores.
- **Backend:** NestJS + Prisma + PostgreSQL. REST for room lifecycle/artworks,
  Socket.IO gateway for live strokes (event-sourced operation log).
- **Infra:** Docker Compose runs Postgres + the API.

## Restrict access to Vietnam only

`scripts/vn-firewall.sh` (run on the VPS as root) allows only Vietnamese IP
ranges to reach the public web ports. Because the app runs in Docker, the rules
go in the `DOCKER-USER` iptables chain (and `ip6tables` for IPv6); it also
installs a systemd timer to refresh the IP list and re-apply on boot.

```bash
# on the VPS
sudo apt-get install -y ipset
sudo WEB_PORTS=80,443 ./scripts/vn-firewall.sh --install   # VN-only on 80/443 + timer
# lock the whole host to VN (SSH still allowed): SCOPE=all SSH_PORT=24700 ...
sudo ./scripts/vn-firewall.sh --clear                      # undo
```

IP data: ipdeny.com aggregated VN zones. Geo-IP is best-effort (VPNs/proxies can
bypass it); pair with strong room passwords for real privacy.

## Architecture (frontend)

```
src/app/
├── core/                       # app-wide singletons (flat)
│   ├── api.config.ts  socket.service.ts  storage.service.ts
│   ├── preferences.store.ts    # GLOBAL signal store (user prefs, localStorage)
│   └── user-preferences.model.ts
└── features/                   # each feature flattened: *.model / *.service / *.store / components
    ├── lobby/                  # join-room (smart) + join-room-card (dumb)
    ├── room/                   # drawing-room (smart) + tool-rail / brush-settings /
    │                           #   canvas-stage / canvas-controls / room-top-bar (dumb)
    │                           #   drawing.store.ts = event-sourced canvas + realtime
    └── review/                 # review-artwork (smart) + artwork-preview / artwork-actions (dumb)
```

**Pattern:** smart containers inject stores/services + own navigation and provide
their feature store at component scope; dumb components are `OnPush` and use only
`input()`/`output()`. The canvas is an **event-sourced operation log** — strokes are
data, so they render, sync, undo and persist from one model.

## Prerequisites

- Node **≥ 22.22.3** (Angular 22 CLI requirement). If you use nvm: `nvm use 22.22.3`.
- Docker Desktop (for the DB + API).

## Run

### 1. Backend + database (Docker)

```bash
docker compose up -d --build      # Postgres on :5432, API on :3000
```

The API runs `prisma db push` on boot to sync the schema, then serves `/api`.

### 2. Frontend (dev server)

```bash
cd frontend
npm install
npm start                         # http://localhost:4200  (proxies /api -> :3000)
```

Open http://localhost:4200 → create or join a room by code → draw. Open the same
room URL in a second tab to see live collaboration.

## Drawing tools

- **Pencil** — freehand, adjustable size + opacity, color picker (palette + recent).
- **Coloring / Fill** — flood fill of enclosed regions.
- **Eraser** — adjustable size (region erase).
- **Undo / Redo** (Ctrl/Cmd-Z, Ctrl/Cmd-Shift-Z), zoom, live remote cursors.
- **Finish** rasterizes the canvas and seals it as the room's artwork.

## API surface

| Method | Path                          | Purpose                          |
| ------ | ----------------------------- | -------------------------------- |
| POST   | `/api/rooms`                  | Create room (optional password)  |
| POST   | `/api/rooms/join`             | Join by code (+ password)        |
| GET    | `/api/rooms/:code`            | Room info                        |
| GET    | `/api/rooms/:code/operations` | Replay log (history)             |
| POST   | `/api/rooms/:code/snapshot`   | Save rasterized artwork          |
| GET    | `/api/artworks/:code`         | Final artwork for review         |

**Socket.IO events:** `room:join`, `op:commit` → `op:applied`, `op:undo` →
`op:undone`, `cursor:move`, `presence:update`.

## Not yet implemented (roadmap)

Auth (currently guest identity), reference-image panel, layer system, time-lapse
replay, R2 storage + server-side snapshotting, PDF/SVG export, community gallery.
