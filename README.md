# 🐇 Warren

```
        \\
         \\
          \\
           \ (\(\
            ( -.-)
        o_(")(")>    Your terminal is too powerful to be a black box.
       🌿~~~~~~~~~~~
```

**Warren** is an open-source, peer-to-peer terminal mesh that lets you access your machines from any device — phone, laptop, or another Mac. No SSH keys. No config files. No cloud accounts. Install, scan, connect.

---

## Topology

```
     ┌─────────┐
     │  Phone  │  (PWA — controller only)
     │  (PWA)  │
     └──┬───┬──┘
        │   │  independent, authenticated connections
        │   │
   ┌────▼┐ ┌▼────┐
   │Mac A│ │Mac B│  (Electrobun — host + controller)
   │host │ │host │
   │+ctrl│ │+ctrl│
   └─────┘ └──┬──┘
               │
          ┌────▼──┐
          │ Mac C │  (headless — host only)
          └───────┘
```

Every arrow is an independent, authenticated connection.
Phone's access to Mac A does **not** grant access to Mac B. Ever.

---

## Quick Start

```bash
# 1. Install the Mac app
brew install --cask warren   # coming soon

# 2. Open Warren — it appears in your menu bar
# 3. Click "Show QR Code"
# 4. Open warren.sh on your phone → scan QR
# 5. You're in.
```

---

## Features

- **Peer-to-peer mesh** — connect to any machine in your Warren network, phone to Mac or Mac to Mac
- **No cloud required** — LAN by default, bring-your-own tunnel (Cloudflare, Tailscale) for remote
- **Touch-optimized terminal** — xterm.js with a mobile toolbar (Ctrl, Alt, Tab, arrows, Esc)
- **Theme system** — native JSON themes + full Hyper theme ecosystem compatibility
- **Open source, always** — MIT licensed, every line auditable, no closed binaries touching your shell
- **Zero trust** — per-pair authentication, no transitive access, explicit pairing required
- **PWA** — add to Home Screen on iPhone/Android, works like a native app

---

## Architecture

```
warren/
├── apps/
│   ├── desktop/    # Electrobun menu bar app (host + controller)
│   ├── web/        # PWA terminal client (xterm.js, vanilla JS)
│   └── docs/       # Astro Starlight documentation
├── packages/
│   ├── core/       # PTY manager, WebSocket server, auth, config
│   ├── themes/     # Theme system, Hyper importer, built-in themes
│   ├── types/      # Shared TypeScript types
│   └── config/     # Shared tsconfig, biome config
└── SPEC.md         # Full specification
```

See [SPEC.md](./SPEC.md) for the full architecture, security model, and roadmap.

**Stack:** TypeScript · Bun · Electrobun · xterm.js · Biome · Turbo

---

## Development

```bash
# Prerequisites: Bun 1.1+
bun install

# Run the PWA dev server
bun run dev --filter=@warren/web

# Run the docs dev server
bun run dev --filter=@warren/docs

# Build everything
bun run build

# Lint + typecheck
bun run lint
bun run typecheck
```

### Project Setup (first time)

```bash
# Desktop app requires Electrobun init
cd apps/desktop
npx electrobun init   # follow prompts, choose tray-app template
bun install
```

---

## Security

Warren is designed with security-first principles:

- **Zero trust** — no connections accepted until explicit pairing
- **Per-pair auth** — every device pair has its own trust relationship (X25519 key exchange in v0.2+)
- **No inherited access** — access is never transitive between nodes
- **Local-first** — LAN by default; remote access only via user-configured tunnels
- **Open source** — every line auditable; no telemetry, no phoning home

See [Security Model](./apps/docs/src/content/docs/security/model.mdx) for details.

---

## 🐰 Contributing

Warren is early-stage and welcomes contributors! See [CONTRIBUTING.md](./CONTRIBUTING.md) for branding guidelines, emoji palette, code style, and setup instructions.

Priority areas:

1. **Bonjour/mDNS discovery** (`packages/core/src/discovery.ts`)
2. **X25519 key exchange + encrypted transport** (`packages/core/src/auth.ts`)
3. **Electrobun desktop app** (`apps/desktop/`)
4. **Themes** — submit themes as PRs to `packages/themes/src/defaults/`

Please read the spec before contributing so you understand the design intent.

---

## Roadmap

| Version | Focus |
|---------|-------|
| v0.1 | PTY + WebSocket + basic auth + manual IP |
| v0.2 | Bonjour discovery + QR pairing + X25519 |
| v0.3 | Electrobun shell + dashboard + PWA served by host |
| v0.4 | Multi-node + session switcher |
| v0.5 | Themes + Hyper importer + PWA lock screen |
| v0.6 | Tunnel guides (Cloudflare, Tailscale) |
| v1.0 | Public release + CLI + code signing + docs |

---

## License

MIT — see [LICENSE](./LICENSE).

_Warren — a network of tunnels, built in the open._ 🐇
