# UB-Share

**Fast, private, peer-to-peer file sharing — no cloud, no limits.**

UB-Share is a desktop application that lets you send files directly between computers over encrypted peer-to-peer connections. Your files never touch a server or sit in someone else's cloud — they go straight from one device to another.

---

## Why UB-Share?

### 🔒 Truly Private
Files transfer directly between devices using encrypted WebRTC DataChannels. No third-party server ever sees, stores, or processes your data. The signaling server only helps devices find each other — once connected, it steps aside entirely.

### ⚡ No File Size Limits
Unlike email attachments (25 MB cap), WeTransfer (2 GB), or Google Drive (15 GB free), UB-Share has **zero file size limits**. Send a 50 GB video project, a 200 GB backup, or a tiny text file — it doesn't matter.

### 🔄 Resumable Transfers
Connection dropped? No problem. UB-Share tracks every chunk and picks up exactly where it left off — even after a full restart. No re-uploading, no wasted bandwidth.

### 🌐 Works Anywhere
- **Same network?** UB-Share discovers peers automatically via mDNS/Zeroconf
- **Different network?** Share a QR code or connection code — peers connect through the signaling server
- **Different country?** Same thing. If both devices have internet, they can share

### 📊 Real-Time Monitoring
Live transfer speeds, progress bars, ETA estimates, pause/resume controls, and a full transfer history with duration tracking.

### 🎨 Dark & Light Themes
Switch between dark and light modes, or let the app follow your system preference.

---

## Features

| Feature | Description |
|---------|-------------|
| **Direct P2P Transfers** | Files go device-to-device over WebRTC — no cloud relay |
| **Multi-Mode Discovery** | Find peers via Remote Server, Local Network (mDNS), QR codes, or connection codes |
| **Resumable Downloads** | Chunk-level tracking survives disconnects and restarts |
| **Pause / Resume** | Manually pause any transfer and resume later |
| **Transfer History** | Full log of past transfers with speed, duration, and connection mode |
| **Live Analytics** | Dashboard with upload/download totals, speeds, and success rates |
| **File Integrity** | SHA-256 hashing ensures files arrive intact |
| **Multiple Simultaneous** | Send and receive multiple files at the same time |
| **QR Code Connect** | Scan a QR code from another device to connect instantly |
| **Connection Codes** | Copy-paste a code to connect with anyone, anywhere |
| **Theme Support** | Dark mode, light mode, and system-auto |
| **Cross-Platform** | Windows, macOS, and Linux |

---

## How It Works

```
┌──────────────┐     Signaling     ┌──────────────┐
│   Device A   │ ◄──── Server ────► │   Device B   │
│  (Sender)    │    (handshake     │  (Receiver)   │
└──────┬───────┘     only)         └──────┬───────┘
       │                                   │
       │         WebRTC DataChannel        │
       │◄══════════════════════════════════►│
       │     Direct encrypted transfer     │
       │     (no server involved)          │
```

1. Both devices connect to the signaling server (a lightweight WebSocket relay)
2. The signaling server introduces them — exchanging connection metadata
3. A direct WebRTC DataChannel is established between the two devices
4. Files transfer directly, encrypted, at full network speed
5. The signaling server plays no further role in the transfer

**The server never sees your files.** It's purely a matchmaker.

---

## Discover Peers

UB-Share offers multiple ways to find and connect with other devices:

| Method | Use Case |
|--------|----------|
| **Remote Share** | Connect with anyone on the internet via the signaling server |
| **Local Network** | Auto-discover devices on the same Wi-Fi/LAN using mDNS |
| **QR Code** | Point your camera at another device's QR code |
| **Connection Code** | Copy-paste a short code via any messaging app |

---

## Built With

- **Electron** — cross-platform desktop framework
- **React + TypeScript** — type-safe reactive UI
- **WebRTC DataChannels** — direct peer-to-peer data transfer
- **Socket.IO** — real-time signaling
- **SQLite + Drizzle ORM** — local persistence for transfers, settings, analytics
- **Tailwind CSS v4** — utility-first styling with design tokens
- **Framer Motion** — smooth UI animations
- **Zustand** — lightweight state management

---

## License

MIT
