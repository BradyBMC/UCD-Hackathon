# UCD-Hackathon

## Running locally

```bash
pip install -r requirements.txt
playwright install chromium
npm install && npm --prefix frontend install
npm run server   # Express API on :5001 (set PYTHON=/path/to/python if needed)
npm run dev      # Vite frontend on :5173 (set API_URL if the API isn't on :5001)
```

## Adding a search source

Provider data is scraped per "source" (currently Health Net California). To add one:

1. Write a `search_<name>(zip, specialty, plan)` function in `scraper/` that returns a list of
   provider dicts (same keys as `parse_healthnet_result` in `scraper/browserscraper.py`).
2. Register it in `SOURCES` in `script.py`, `server.js`, and `frontend/src/App.tsx`.
