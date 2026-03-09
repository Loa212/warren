# Warren Desktop App

The Warren menu bar / tray application for macOS (and eventually Windows/Linux).

Built with [Electrobun](https://blackboard.sh/electrobun/docs/) — a Bun-native desktop
framework using system webviews. ~14MB bundle, TypeScript throughout, no Electron.

## Setup

Electrobun requires an initial project scaffold before the Warren source will run:

```bash
# 1. Initialize Electrobun (from this directory)
cd apps/desktop
npx electrobun init
# Choose "tray-app" template when prompted

# 2. Install dependencies
bun install

# 3. Run in dev mode
bun run dev
```

> **Why the manual init?** Electrobun generates native boilerplate (Swift tray bindings,
> build scripts) that varies by platform. The Warren source in `src/` is the application
> logic that sits on top of that scaffold.

## Structure

```
apps/desktop/
├── electrobun.config.ts   # App configuration (windows, build settings)
├── src/
│   ├── index.ts           # Main Bun process (server, tray, windows)
│   └── views/
│       └── dashboard/
│           ├── index.html # Dashboard UI
│           └── api.ts     # HTTP client for Warren server API
```

## How It Works

```
[Bun Main Process (src/index.ts)]
  ├── Starts Warren WebSocket server (@warren/core)
  ├── Creates system tray icon
  └── Manages BrowserWindow (dashboard)
        └── [System WebView (dashboard/index.html)]
              └── Fetches data from http://localhost:9470
```

The Warren server runs in the same Bun process as the Electrobun main process.
The dashboard is a webview that talks to the server over HTTP.

## Development Status

- [x] Dashboard UI (devices, sessions, tunnels, settings tabs)
- [x] Health endpoint integration
- [ ] PTY sessions list (needs `/sessions` API endpoint)
- [ ] Paired devices list (needs pairing system v0.2)
- [ ] QR code pairing flow (v0.2)
- [ ] Native tray icon assets
- [ ] Code signing + notarization (v1.0)

## Resources

- [Electrobun Docs](https://blackboard.sh/electrobun/docs/)
- [Warren SPEC.md](../../SPEC.md)
