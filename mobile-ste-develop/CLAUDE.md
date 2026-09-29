# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based adaptation of MIT ScratchJr — a visual programming environment for children ages 5-7. The goal is browser compatibility while maintaining file format compatibility with the official iOS/Android versions. It also integrates as a React Native WebView component in the `mobile-ste` app.

## Commands

The following commands must be run from `public/ScratchJr/`:

```bash
# Development
npm run watch        # Webpack watch mode (recommended for development)
npm run start        # Webpack dev server on port 8601
npm run dev          # One-time development build

# Production
npm run build        # Production webpack bundle → static/app.bundle.js

# Code quality
npm run lint         # ESLint on src/**
```

The following commands are run from the repo root (React Native / Expo):

```bash
npm run ios          # Build & run iOS via Expo
npm run android      # Build & run Android via Expo
npm run build:apk    # Build Android APK release
npm run build:aab    # Build Android AAB release
```

Build requires `cross-env NODE_OPTIONS=--openssl-legacy-provider` (legacy OpenSSL — already in npm scripts). There is no test suite; linting is the primary automated quality check.

## Architecture

### Platform Abstraction (`src/tablet/`)

The entire web/iOS/Android platform difference is handled here. `OS.js` is a factory that selects the right implementation at runtime:
- `WebOS.js` — browser (LocalForage storage, RecordRTC audio, SoundManager2 playback)
- `iOS.js` — WKWebView bridge to native Swift APIs
- `Android.js` — JavascriptInterface bridge to native Android APIs

When adding features that require OS-specific behavior, follow this pattern: implement in each platform file and dispatch from `OS.js`.

### Entry Points (`src/entry/`)

Each page has its own webpack entry point and corresponding HTML in `static/`:
- `app.js` — bootstraps CSS, locale, and media library; called by all pages
- `editor.js` → `static/editor.html` — the main ScratchJr editor
- `home.js` → `static/home.html` — project lobby
- `index.js` → `static/index.html` — splash screen

### Editor Architecture (`src/editor/`)

- `ScratchJr.js` — top-level editor singleton; orchestrates all subsystems
- **`ui/`** — all UI controllers (Project, ScriptsPane, Palette, Library, etc.)
- **`engine/`** — runtime execution: `Runtime.js` runs script threads, `Sprite.js`/`Stage.js` render to Canvas, `Prims.js` implements every block's behavior
- **`blocks/`** — `BlockSpecs.js` defines all block types; `Block.js` handles drag-and-drop

### Paint Editor (`src/painteditor/`)

A full vector paint editor using SVG + Canvas. `Paint.js` and `Path.js` are the two largest files (~66KB each). `SVGTools.js` handles the SVG↔Canvas conversion pipeline.

### Key Global Objects

```javascript
window.JrConfig        // Pre-load configuration (e.g., onSaveCloud callback)
window.ScratchJr       // Public API: getProjectSjr(), getProjectCover(), loadProjectSjr(url)
window.Settings        // Loaded from static/settings.json at startup
window.ReactNativeWebView  // Message bridge when running inside React Native
```

### Project File Format

Projects are `.sjr` files — ZIP archives containing XML, sprites, and assets. Browser storage uses LocalForage (IndexedDB with LocalStorage fallback). Auto-save runs every 30 seconds by default (configured in `static/settings.json`).

### Build Output

Webpack bundles everything into `static/app.bundle.js`. Static assets (images, sounds, localizations, sprite libraries) are served directly from `static/` and are not bundled. Minification is intentionally disabled in `webpack.config.js`.

> **IMPORTANT:** Never directly edit or update `public/ScratchJr/static/app.bundle.js` or `public/ScratchJr/static/app.bundle.js.map`. These are generated build artifacts. Always edit source files under `src/` and run `npm run build` (or `npm run dev`) to regenerate them.

### Localization

20+ languages in `static/localizations/`. Loaded dynamically at startup via `src/utils/Localization.js`. Language strings are plain JSON keyed by message ID.

### Media Library

`static/media.json` (~1300 lines) defines all sprites, backgrounds, and sounds available in the library. To add custom sprites/backgrounds/sounds, update this file and add assets to `static/svglibrary/`, `static/pnglibrary/`, or `static/sounds/`.

## React Native Integration

The editor runs inside a WebView in the React Native app. Communication uses `window.ReactNativeWebView.postMessage()` outbound and `window.addEventListener('message')` inbound. The iOS project is in `../../ios/` relative to this directory.
