# Warren Project Memory

## Project: Warren
P2P terminal mesh. Open source, MIT. Located at `/Users/loa212/dev/warren`.

## Architecture
- Turborepo + Bun workspaces
- `packages/types` — shared TS types (@warren/types)
- `packages/core` — PTY, WebSocket server, auth, config (@warren/core)
- `packages/themes` — JSON themes, Hyper importer (@warren/themes)
- `packages/config` — shared tsconfig/biome
- `apps/desktop` — Electrobun tray app (@warren/desktop)
- `apps/web` — PWA terminal client with xterm.js, Vite (@warren/web)
- `apps/docs` — Astro Starlight docs (@warren/docs)

## Key Technical Findings

### Bun + node-pty compatibility
Bun's `tty.ReadStream` closes PTY file descriptors immediately, preventing node-pty
from reading PTY output. Fixed in `packages/core/src/pty.ts` by monkey-patching
`tty.ReadStream` BEFORE importing node-pty with a polling implementation using
`readSync()`. This works around the Bun incompatibility.

Also: the `spawn-helper` binary in node-pty prebuilds must be executable:
```
chmod +x node_modules/.bun/node-pty@1.1.0/node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper
```

### tsconfig approach
- Base tsconfig in `packages/config/tsconfig.base.json` has `"types": []` (empty)
- Packages that need bun types add `"types": ["bun-types"]` + `bun-types` devDep
- Packages that need node types add `"types": ["node"]` + `@types/node` devDep
- Removed `rootDir` from all packages that import workspace deps (causes TS6059)
- Web app uses `"lib": ["ESNext", "DOM", "DOM.Iterable"]` for NodeList iteration

### Electrobun types
The electrobun package ships TypeScript source (not .d.ts) with internal bugs.
Solution: local type stub at `apps/desktop/types/electrobun.d.ts` with `paths`
override in tsconfig to avoid type-checking Electrobun's buggy internals.

### Astro typecheck
Must use `astro sync && astro check` not `tsc --noEmit` for docs package.
`astro sync` generates `.astro/types.d.ts` for virtual module `astro:content`.

### PTY test: correct Enter key
PTY requires `\r` (carriage return) as Enter, not `\n`.

## Commands
- `bun install` — install all deps
- `bun run typecheck` — 8/8 pass
- `bun test packages/core/src/test/pty.test.ts` — 4/4 pass
- `bun run dev --filter=@warren/web` — start PWA dev server
- `bun run dev --filter=@warren/docs` — start docs dev server

## User Preferences
- No semicolons (biome config: `"semicolons": "asNeeded"`)
- Single quotes (biome: `"quoteStyle": "single"`)
- Bun for everything — no npm, no pnpm
