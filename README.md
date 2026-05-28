# UB-Share App

Electron desktop application for peer-to-peer file sharing.

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

## Setup

```bash
# Install dependencies
npm install

# Rebuild native modules for Electron
npx @electron/rebuild -f -w better-sqlite3

# Install Electron binary (if missing)
node node_modules/electron/install.js
```

## Development

```bash
npx electron-vite dev
```

This starts Vite dev server with HMR for the renderer and watches the main process.

## Build

```bash
# Build all bundles (main, preload, renderer)
npx electron-vite build
```

Output goes to `out/`:

```
out/
├── main/index.js          ← Bundled main process
├── preload/index.js       ← Bundled preload script
└── renderer/              ← Bundled React app
```

## Package for Distribution

```bash
# Build + package (requires electron-builder config)
npm run build
```

## Project Structure

```
src/
├── main/                  ← Electron main process
│   ├── index.ts               Entry point, window creation, lifecycle
│   ├── db/
│   │   ├── database.ts        SQLite init, WAL mode, migrations
│   │   ├── schema.ts          Drizzle ORM table definitions
│   │   └── repositories/      CRUD for transfers, chunks, peers, settings
│   ├── services/
│   │   ├── signaling-client.ts    Socket.IO connection to server
│   │   ├── webrtc-manager.ts      RTCPeerConnection lifecycle
│   │   ├── transfer-engine.ts     Chunk send/receive binary protocol
│   │   ├── transfer-manager.ts    Orchestrator: queuing, approval, state
│   │   ├── resume-engine.ts       Recovery after disconnect/restart
│   │   ├── file-hasher.ts         Streaming SHA-256
│   │   ├── settings-service.ts    Settings cache
│   │   └── analytics-service.ts   Transfer statistics
│   ├── ipc/
│   │   └── ipc-handlers.ts       IPC bridge registrations
│   └── utils/                 Chunk math, file ops, crypto
│
├── preload/               ← Context bridge (window.ubshare API)
│   ├── index.ts
│   └── types.d.ts
│
├── renderer/              ← React frontend
│   └── src/
│       ├── App.tsx             HashRouter with lazy routes
│       ├── index.css           Design system (neutral dark + teal)
│       ├── pages/              Dashboard, Peers, Transfers, History, Settings
│       ├── components/         Sidebar, TransferCard, PeerCard, modals
│       ├── stores/             Zustand stores (app, peer, transfer, settings)
│       ├── hooks/              Custom hooks (useTransfers, usePeers, useSettings)
│       └── lib/                Formatters, animations, utils
│
└── shared/                ← Shared between main & renderer
    ├── types.ts               All TypeScript interfaces
    └── constants.ts           Socket events, IPC channels, defaults
```

## Configuration

The app stores data in:

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%/ub-share/` |
| macOS | `~/Library/Application Support/ub-share/` |
| Linux | `~/.config/ub-share/` |

Contents:
- `ub-share.sqlite` — local database (transfers, peers, settings)
- Temp files during active downloads

## Signaling Server

By default the app connects to `ws://localhost:3001`. Change this in **Settings → Network → Signaling Server URL**.

For the signaling server setup, see [`../server/README.md`](../server/README.md).
