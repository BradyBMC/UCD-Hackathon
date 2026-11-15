# UCD-Hackathon

Find a provider by zip code, specialty and insurance plan.

- `frontend/` — React + Vite app (port 5173)
- `server.js` — Express API (port 5001), `POST /api/search` runs `script.py`
- `script.py` — placeholder search script (returns "Hello world" for now)
- `scraper/` — Health Net scraper, not wired up yet

## Setup (once, and after pulling new packages)

```bash
npm install && npm --prefix frontend install
```

## Run

Terminal 1 (backend):

```bash
npm run server
```

Terminal 2 (frontend):

```bash
npm run dev
```

Open http://localhost:5173. Set `PYTHON=python` before `npm run server` if `python3` isn't your Python.
