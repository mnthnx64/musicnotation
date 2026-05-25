# EzSwara — Carnatic Music Notation App

A client-side React + Vite PWA for transcribing, composing, and exporting Carnatic music notation.

## Cursor Cloud specific instructions

### Services

| Service | Command | URL |
|---------|---------|-----|
| Vite dev server | `npm run dev` | http://localhost:5173/musicnotation/ |

This is a fully client-side SPA — no backend, database, or external API dependencies.

### Key commands

- **Install deps:** `npm install`
- **Dev server:** `npm run dev` (serves at `/musicnotation/` base path)
- **Build:** `npm run build` (outputs to `docs/` for GitHub Pages)
- **Tests:** `node test-pipeline.mjs` (30 unit tests for the audio pipeline)
- **Preview prod build:** `npm run preview`

### Notes

- There is no ESLint or other lint tool configured in this project.
- The Vite base path is `/musicnotation/` — the app is served at that sub-path in dev and production.
- The test file `test-pipeline.mjs` generates a `test-mohanam.wav` artifact in the workspace root (not committed).
- The app has three modes: **File** (upload audio for transcription), **Live** (microphone-based), and **Compose** (manual grid editor). Compose mode is the easiest to test without audio hardware.
