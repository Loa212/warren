# Warren Desktop App

The Warren menu bar / tray application for macOS (and eventually Windows/Linux).

Built with [Electrobun](https://blackboard.sh/electrobun/docs/) — a Bun-native desktop
framework using system webviews. ~14MB bundle, TypeScript throughout, no Electron.

## Setup

```bash
# From the repo root
bun install

# Run in dev mode
cd apps/desktop
bun run dev

# Build .app bundle
bun run build
```

> **Note:** On first run, Electrobun downloads platform-specific binaries to
> `node_modules/.electrobun-cache/`. This is automatic — no manual init needed.

## Structure

```
apps/desktop/
├── electrobun.config.ts   # App configuration (windows, build settings)
├── src/
│   ├── bun/
│   │   └── index.ts       # Main Bun process (server, tray, windows)
│   ├── dashboard/
│   │   ├── index.html     # Dashboard UI
│   │   └── index.ts       # View-side API client
│   └── assets/
│       └── iconTemplate.svg  # Tray icon (SVG source)
└── types/
    └── electrobun.d.ts    # Type stubs for Electrobun
```

## How It Works

```
[Bun Main Process (src/bun/index.ts)]
  ├── Starts Warren WebSocket server (@warren/core)
  ├── Creates system tray icon with menu
  └── Manages BrowserWindow (dashboard)
        └── [System WebView (dashboard/index.html)]
              └── Fetches data from http://localhost:9470
```

The Warren server runs in the same Bun process as the Electrobun main process.
The dashboard is a webview that talks to the server over HTTP.

## TODO

- [ ] Convert tray icon SVG to 32x32 PNG template image (white on transparent)
- [ ] PTY sessions list (needs `/sessions` API endpoint)
- [ ] Paired devices list (needs pairing system v0.2)
- [ ] QR code pairing flow (v0.2)
- [ ] Code signing + notarization (v1.0)

## Resources

- [Electrobun Docs](https://blackboard.sh/electrobun/docs/)
- [Warren SPEC.md](../../SPEC.md)
