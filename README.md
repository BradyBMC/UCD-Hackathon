# UCD-Hackathon

Find a provider by zip code, specialty and insurance plan.

- `frontend/` — React + Vite app (port 5173)
- `server.js` — Express API (port 5001), `POST /api/search` runs `script.py`
- `script.py` — runs the scraper for the chosen source and prints JSON
- `scraper/` — Health Net scraper (Playwright) and result parser

## Setup (once, and after pulling new packages)

```bash
npm install && npm --prefix frontend install
pip install -r requirements.txt
playwright install chromium
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

Open http://localhost:5173. Set `PYTHON=/path/to/python` before `npm run server` if `python3`
isn't the Python with Playwright installed. Set `API_URL` before `npm run dev` if the API isn't
on port 5001.

## Adding a search source

Provider data is scraped per "source" (currently Health Net California). To add one:

1. Write a `search_<name>(zip, specialty, plan)` function in `scraper/` that returns a list of
   provider dicts (same keys as `parse_healthnet_result` in `scraper/browserscraper.py`).
2. Register it in `SOURCES` in `script.py`, `server.js`, and `frontend/src/App.tsx`.
