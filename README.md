# UCD-Hackathon

Find a provider by zip code, specialty and insurance plan.

- `frontend/` — React + Vite app (port 5173)
- `server.js` — Express API (port 5001), `POST /api/search` runs `script.py`
- `script.py` — runs the scraper for the chosen source and prints JSON
- `scraper/` — Health Net scraper (Playwright) and result parser

## Run

```bash
./run.sh
```

This sets up anything missing (a `.venv` with Playwright and its Chromium, and the npm
packages), then starts the API (port 5001) and the frontend (port 5173) together. Ctrl-C stops
both. Use `PORT=5002 ./run.sh` if 5001 is taken.

If no Python with SSL support is found, install one (`brew install python`) or point the
script at one with `PYTHON_BOOTSTRAP=/path/to/python3 ./run.sh`.

## Adding a search source

Provider data is scraped per "source" (currently Health Net California). To add one:

1. Write a `search_<name>(zip, specialty, plan)` function in `scraper/` that returns a list of
   provider dicts (same keys as `parse_healthnet_result` in `scraper/browserscraper.py`).
2. Register it in `SOURCES` in `script.py`, `server.js`, and `frontend/src/App.tsx`.
