# 🐇 Contributing to Warren

Thanks for your interest in Warren! This guide covers the branding identity, conventions, and how to get started.

---

## Emoji Palette

Use these as the brand emoji set across README, docs, commit messages, CLI output, and social:

| Emoji | Usage |
|-------|-------|
| 🐇 | Primary mascot — README header, CLI banner, release notes |
| 🐰 | Friendly face — docs, onboarding, welcome messages |
| 🥕 | Accent — config, settings, feeding your warren |
| 🕳️ | The tunnel/hole — connections, pairing, discovery |
| 🌸 / 🌿 / 🌻 | Nature/chill vibes — doc headers, seasonal themes, community |

## Branding Guidelines

### Tone

Warren is **cozy, technical, open-source friendly, and never corporate**. Think: a chill rabbit sitting at the entrance of its burrow in a meadow, surrounded by flowers. The rabbit is technical but relaxed.

### Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Purple | `#b794f4` | Primary brand color, rabbit |
| Light purple | `#c084fc` | Accent, ear highlights |
| Dark | `#12111a` | Background, UI chrome |
| Coral | `#f28b82` | Warm accent, nose |
| Highlight | `#d4c8f0` | Eye highlights, text |

### Logo & Icons

- **App icon**: Purple geometric rabbit on dark rounded-square background
- **Menu bar icon**: Monochrome rabbit silhouette (macOS template icon, white on transparent)
- **Favicon**: Simplified rabbit head SVG
- Icons live in `apps/web/public/icons/` (PWA) and `apps/desktop/assets/` (macOS)

To generate PNG menu bar icons from the SVG source:

```bash
# Requires Inkscape or similar
inkscape apps/desktop/assets/iconTemplate.svg -w 16 -h 16 -o iconTemplate.png
inkscape apps/desktop/assets/iconTemplate.svg -w 32 -h 32 -o iconTemplate@2x.png
```

---

## Commit Style

- **Conventional commits**: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`
- Prefix with 🐇 for releases and milestones
- Keep messages concise and descriptive

```
feat: add QR code pairing flow
fix: resolve PTY resize on reconnect
docs: 🐇 update README for v0.2 release
```

---

## Code Style

- **Biome** for formatting and linting — run `bun run format` and `bun run lint`
- Single quotes, no semicolons
- **Bun** for all runtime, package management, and tooling

---

## Getting Started

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

# Format
bun run format

# Run tests
bun test
```

---

## Architecture

See [spec.md](./spec.md) for the full architecture, security model, and roadmap.

```
warren/
├── apps/
│   ├── desktop/    # Electrobun menu bar app (host + controller)
│   ├── web/        # PWA terminal client (React + Vite + xterm.js)
│   └── docs/       # Astro Starlight documentation
├── packages/
│   ├── core/       # PTY manager, WebSocket server, auth, config
│   ├── themes/     # Theme system, Hyper importer, built-in themes
│   ├── types/      # Shared TypeScript types
│   └── config/     # Shared tsconfig, biome config
└── spec.md         # Full specification
```

---

## Priority Areas

1. **Bonjour/mDNS discovery** (`packages/core/src/discovery.ts`)
2. **X25519 key exchange + encrypted transport** (`packages/core/src/auth.ts`)
3. **Electrobun desktop app** (`apps/desktop/`)
4. **Themes** — submit themes as PRs to `packages/themes/src/defaults/`

---

## Submitting Changes

1. Fork the repo and create a branch from `main`
2. Make your changes following the code style above
3. Run `bun run lint` and `bun run typecheck` before committing
4. Write a clear PR description explaining the **why**, not just the what
5. Reference any related issues in your PR

---

_Warren — a network of tunnels, built in the open._ 🐇
