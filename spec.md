# Warren — Specification v0.1

> **Your terminal is too powerful to be a black box.**
>
> Warren is an open-source, peer-to-peer terminal mesh that lets you access your machines from any device — phone, laptop, or another Mac. No SSH keys, no config files, no cloud accounts. Install, scan, connect.

---

## Overview

Warren is a network of tunnels. Every machine running Warren is a **node** in your personal mesh. Any node can be a **host** (offers a shell), a **controller** (connects to other hosts), or both simultaneously.

**Topologies Warren supports:**

- Phone → Mac
- Mac → Mac
- Mac ↔ Mac (both host + controller)
- Phone → multiple Macs (session switcher)
- Mac → multiple Macs

Every connection is independent and directly authenticated between two devices. No device inherits access to another device's connections.

---

## Why Open Source

Terminal apps have full shell access to your machine. They can read your SSH keys, access your files, run any command as you. TermAway, Macky, and others ask you to trust a closed binary with this level of access.

Warren is MIT-licensed. Every line of code is auditable. Every update is verifiable. Your terminal deserves nothing less.

---

## Architecture

### Stack

| Layer             | Technology                              | Rationale                                                                                                            |
| ----------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Desktop framework | **Electrobun** (v1)                     | Bun runtime, system webview, tray app support, ~14MB bundle, auto-updates, .dmg generation. All TypeScript, no Rust. |
| Shell spawning    | **Bun** (node-pty via FFI or Bun shell) | PTY allocation, shell process management                                                                             |
| Transport         | **WebSocket** (secure)                  | Full-duplex terminal I/O between nodes                                                                               |
| Discovery         | **Bonjour/mDNS**                        | Zero-config LAN discovery                                                                                            |
| Terminal renderer | **xterm.js**                            | Industry-standard terminal emulator for the browser                                                                  |
| Theme engine      | **Custom JSON + Hyper theme import**    | Native theme format with compatibility layer for Hyper ecosystem                                                     |

### Node Architecture

Every Warren installation is a **node** with two capabilities that can be independently enabled:

```
┌─────────────────────────────────┐
│           Warren Node           │
│                                 │
│  ┌───────────┐  ┌────────────┐  │
│  │ Host Mode │  │ Controller │  │
│  │           │  │    Mode    │  │
│  │ - PTY mgr │  │ - Session  │  │
│  │ - WS srv  │  │   list     │  │
│  │ - Auth    │  │ - xterm.js │  │
│  │ - Logging │  │ - Switcher │  │
│  └───────────┘  └────────────┘  │
│                                 │
│  ┌─────────────────────────────┐│
│  │      Pairing & Trust DB     ││
│  │  (per-device keypairs/tokens)││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**Mac app (Electrobun):** Full node — both host and controller. Runs as a menu bar/tray app with a Docker Desktop-style dashboard window.

**Phone PWA:** Controller-only node — connects to hosts, cannot offer a shell. Served by any host on the LAN, or installable as a standalone PWA.

### Connection Model

```
     ┌─────────┐
     │ Phone   │ (controller only)
     │ (PWA)   │
     └──┬───┬──┘
        │   │
        │   │  independent connections
        │   │
   ┌────▼┐ ┌▼────┐
   │Mac A│ │Mac B│
   │(host│ │(host│
   │+ctrl)│ │+ctrl)│
   └─────┘ └──┬──┘
               │
          ┌────▼──┐
          │Mac C  │
          │(host) │
          └───────┘
```

Each arrow is an independent, authenticated connection. Phone's access to Mac A does NOT grant access to Mac B. Mac B's access to Mac C does NOT grant Phone access to Mac C.

---

## Security Model

### Principles

1. **Zero trust by default** — no connections accepted until explicit pairing
2. **Per-pair authentication** — every device pair has its own trust relationship
3. **No inherited access** — access is never transitive between nodes
4. **Privacy-first** — no logging by default, opt-in later
5. **Local-first** — LAN by default, tunnels are user-configured and optional

### Pairing Flow

**First-time pairing between two devices:**

1. Host displays a QR code + numeric PIN (fallback for manual entry)
2. Controller scans QR / enters PIN
3. Devices perform key exchange (X25519 ECDH)
4. Shared secret derived, stored on both devices
5. Host assigns a device ID to the controller
6. Connection established with mutual authentication

**Subsequent connections:**

1. Controller connects to host (mDNS discovery or saved address)
2. Mutual authentication using stored keypair
3. Session established

### PWA Lock Screen

The phone PWA has an optional PIN lock (like a phone lock screen). This is a local-only lock — it prevents someone who picks up your phone from accessing open terminal sessions. It does NOT replace the pairing authentication.

### Host-Side Controls (Dashboard)

- View all paired devices with status (online/offline/last seen)
- Revoke any device instantly (deletes trust relationship)
- Toggle host mode on/off globally (stop accepting all connections)
- Per-device permissions: **full shell** or **revoked** (v1 scope)

### Encryption

All terminal I/O between paired devices is encrypted end-to-end using the shared secret established during pairing. The WebSocket transport carries only encrypted payloads.

---

## Desktop App (Mac — Electrobun)

### Tray Icon

Warren lives in the menu bar. The tray icon shows connection status:

- 🟢 Host mode active, devices connected
- 🟡 Host mode active, no connections
- ⚫ Host mode disabled

**Tray dropdown (quick access):**

- Toggle host mode on/off
- Connected devices count
- "Open Dashboard" → full window
- "Show QR Code" → pairing flow
- Quit

### Dashboard (Full Window)

Docker Desktop-style interface with sidebar navigation:

**Devices**

- List of all paired devices
- Status indicators (online/offline/last seen)
- Revoke access button per device
- "Pair New Device" action

**Sessions**

- Active terminal sessions
- Which device, started when, shell type
- Kill session action

**Tunnels**

- In-app guided setup for remote access
- Supported providers (v1): Cloudflare Tunnel, Tailscale
- Additional providers post-launch: ngrok (+ more)
- Status/health monitoring for active tunnels
- Referral links for tunnel provider signups (monetization hook)

**Connections** (Controller Mode)

- List of other Warren hosts this Mac is connected to
- Connect/disconnect actions
- Terminal tabs for each connection (embedded xterm.js)

**Settings**

- Default shell (zsh, bash, etc.)
- Host mode auto-start on login
- Theme selection
- Logging toggle (opt-in)
- Network interface binding
- Port configuration

---

## Phone PWA (Controller)

### Two-Screen Layout

**Screen 1: Config / Home**

- List of paired hosts with status
- Tap to connect → opens terminal
- Session switcher (tab bar or swipe between active sessions)
- PIN lock settings
- Theme picker
- "Add New Host" → QR scanner / PIN entry

**Screen 2: Terminal**

- Full xterm.js terminal
- Touch-optimized toolbar: Ctrl, Alt, Esc, Tab, Arrow keys
- Session tab bar at top (switch between connected hosts)
- Swipe gestures for tab switching
- Pull-down for quick actions (disconnect, settings)

### PWA Features

- Add to Home Screen prompt
- Offline-capable config screen (terminal requires connection)
- Service worker for asset caching
- Responsive — works on iPhone, iPad, any browser

---

## Theme System

### Native Theme Format

Warren themes are JSON files:

```json
{
  "name": "Rabbit Hole",
  "author": "warren-community",
  "version": "1.0.0",
  "colors": {
    "background": "#1a1b26",
    "foreground": "#a9b1d6",
    "cursor": "#c0caf5",
    "cursorAccent": "#1a1b26",
    "selection": "#33467c",
    "black": "#15161e",
    "red": "#f7768e",
    "green": "#9ece6a",
    "yellow": "#e0af68",
    "blue": "#7aa2f7",
    "magenta": "#bb9af7",
    "cyan": "#7dcfff",
    "white": "#a9b1d6",
    "brightBlack": "#414868",
    "brightRed": "#f7768e",
    "brightGreen": "#9ece6a",
    "brightYellow": "#e0af68",
    "brightBlue": "#7aa2f7",
    "brightMagenta": "#bb9af7",
    "brightCyan": "#7dcfff",
    "brightWhite": "#c0caf5"
  },
  "ui": {
    "accent": "#7aa2f7",
    "border": "#292e42",
    "tabBar": "#1a1b26",
    "activeTab": "#292e42"
  },
  "font": {
    "family": "JetBrains Mono, monospace",
    "size": 14,
    "lineHeight": 1.5
  }
}
```

### Hyper Theme Compatibility

Warren includes a Hyper theme adapter that can import themes from the Hyper ecosystem:

```
warren theme import hyper-snazzy
```

The adapter extracts color values from Hyper's JS-based theme format and converts them to Warren's JSON format. Imported themes are saved as native Warren themes and can be further customized.

### Theme Distribution

Themes can be shared as:

- JSON files (copy/paste, gist, etc.)
- npm packages (following a `warren-theme-*` naming convention)
- Community theme gallery on warren.sh (future)

---

## Discovery & Networking

### LAN (Default)

Bonjour/mDNS service advertisement:

```
Service Type: _warren._tcp
Port: 9470 (default, configurable)
TXT Records:
  - version=1.0.0
  - nodeId=<unique-node-id>
  - hostName=<machine-name>
  - hostMode=true|false
```

Controllers discover hosts automatically on the local network. No IP address entry required.

### Remote Access (User-Configured Tunnels)

Warren does NOT provide a relay server. For remote access, users configure their own tunnel:

**Supported providers (in-app guided setup):**

| Provider            | How It Works                                 | Free Tier      |
| ------------------- | -------------------------------------------- | -------------- |
| Cloudflare Tunnel   | `cloudflared` tunnel to Warren's port        | Yes            |
| Tailscale           | Mesh VPN, Warren auto-discovered via tailnet | Yes (personal) |
| ngrok (post-launch) | `ngrok tcp` to Warren's port                 | Limited        |

Warren's dashboard includes step-by-step setup guides for each provider, with affiliate/referral links where available. The tunnel status is monitored and displayed in the Tunnels tab.

**Health endpoint:** Warren exposes `GET /health` on its HTTP port, returning node status, uptime, and version. Tunnel providers can use this for keep-alive/monitoring.

---

## Monetization

Warren is open-source and free. Revenue opportunities:

1. **Tunnel provider referrals** — In-app setup guides with affiliate links for Cloudflare, Tailscale, ngrok. Users need these for remote access; Warren makes setup trivial and gets a referral cut.

2. **Hosted relay service (future)** — Warren Cloud: a managed relay for users who don't want to configure their own tunnel. Subscription-based. The open-source app works without it.

3. **Theme marketplace (future)** — Premium themes, featured theme slots.

4. **Enterprise features (future)** — Team management, audit logging, SSO, centralized device management.

---

## CLI

Warren includes a CLI for headless/scripting use:

```bash
# Host management
warren host start          # Enable host mode
warren host stop           # Disable host mode
warren host status         # Show status + connected devices

# Pairing
warren pair                # Show QR + PIN for pairing
warren pair --pin-only     # PIN only (no QR, for SSH sessions)

# Device management
warren devices             # List paired devices
warren devices revoke <id> # Revoke a device

# Connections (controller mode)
warren connect <host>      # Connect to a host
warren sessions            # List active sessions

# Themes
warren theme list                    # List installed themes
warren theme set <name>              # Activate a theme
warren theme import <hyper-theme>    # Import Hyper theme
warren theme create <name>           # Scaffold new theme

# Tunnel management
warren tunnel status       # Show tunnel health
warren tunnel setup        # Interactive tunnel setup guide
```

---

## Roadmap

### v0.1 — Proof of Concept

- [ ] Bun WebSocket server that spawns PTY
- [ ] xterm.js web client connecting over WS
- [ ] Basic auth (static token)
- [ ] Works on LAN with manual IP entry

### v0.2 — Pairing & Discovery

- [ ] Bonjour/mDNS service advertisement + discovery
- [ ] QR code + PIN pairing flow
- [ ] X25519 key exchange
- [ ] Encrypted WebSocket transport
- [ ] Device trust storage (SQLite)

### v0.3 — Electrobun Shell

- [ ] Electrobun tray app with host mode toggle
- [ ] Dashboard window (devices, sessions)
- [ ] PWA served by the host
- [ ] Phone terminal with touch toolbar

### v0.4 — Multi-Node

- [ ] Mac-to-Mac connections (controller mode)
- [ ] Session switcher (multiple hosts)
- [ ] PWA session tabs

### v0.5 — Themes & Polish

- [ ] Native JSON theme format
- [ ] Hyper theme importer
- [ ] Theme picker in dashboard + PWA
- [ ] PWA lock screen (PIN)

### v0.6 — Tunnels

- [ ] In-app tunnel setup guides (Cloudflare, Tailscale)
- [ ] Tunnel health monitoring
- [ ] Health endpoint (`/health`)
- [ ] Referral link integration

### v1.0 — Public Release

- [ ] CLI tool
- [ ] Code signing + notarization
- [ ] Auto-update via Electrobun
- [ ] Documentation site (warren.sh)
- [ ] Landing page
- [ ] npm package for themes

### v1.1+ — Future

- [ ] ngrok support
- [ ] Opt-in session logging
- [ ] Read-only permission level
- [ ] Granular command allowlists
- [ ] Warren Cloud (hosted relay)
- [ ] Theme marketplace
- [ ] Enterprise features

---

## Project Info

|               |                                                                            |
| ------------- | -------------------------------------------------------------------------- |
| **Name**      | Warren                                                                     |
| **Tagline**   | Your terminal is too powerful to be a black box.                           |
| **Website**   | warren.sh                                                                  |
| **License**   | MIT                                                                        |
| **GitHub**    | TBD (new org or under Loa212)                                              |
| **Stack**     | TypeScript, Bun, Electrobun, xterm.js                                      |
| **Platforms** | macOS (primary), PWA (phone/tablet), Windows/Linux (future via Electrobun) |

---

_Warren — a network of tunnels, built in the open._
