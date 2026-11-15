# UCD-Hackathon

Find a provider by zip code, specialty and insurance plan.

- `frontend/` — React + Vite app (port 5173)
- `server.js` — Express API (port 5001), `POST /api/search` runs `script.py`
- `script.py` — runs the scraper for the chosen source and prints JSON
- `scraper/` — Health Net scraper (Playwright) and result parser
- `retell/` — Retell voice agent that phones a provider's office to check insurance and open
  appointments (`POST /api/calls`, `GET /api/calls/:id`)

## Run

```bash
./run.sh
```

This sets up anything missing (a `.venv` with Playwright and its Chromium, and the npm
packages), then starts the API (port 5001) and the frontend (port 5173) together. Ctrl-C stops
both. Use `PORT=5002 ./run.sh` if 5001 is taken.

If no Python with SSL support is found, install one (`brew install python`) or point the
script at one with `PYTHON_BOOTSTRAP=/path/to/python3 ./run.sh`.

## Calling provider offices (Retell)

Each search result has a **Call office** button. A Retell AI agent phones the office, asks
whether they take the patient's insurance and are accepting new patients, and asks for open
appointment times. When the call ends, the answers, a summary and the transcript appear on the
card.

One-time setup:

1. `cp .env.example .env`, then set `RETELL_API_KEY` to your key.
2. Buy a phone number in the Retell dashboard (Phone Numbers > Buy). Outbound calls need one.
3. Set `RETELL_TEST_TO_NUMBER=+1<your cell>` in `.env` while testing. Every call then rings you
   instead of the real office, so you can play the receptionist. Clear it to call real offices.
4. `npm run retell:setup` creates the agent and saves `RETELL_LLM_ID`, `RETELL_AGENT_ID` and
   `RETELL_FROM_NUMBER` to `.env`.
5. Restart `./run.sh`.

To change what the agent says or which answers it extracts, edit `retell/agentConfig.js` and
run `npm run retell:setup` again. That updates the existing agent.

## Adding a search source

Provider data is scraped per "source" (currently Health Net California). To add one:

1. Write a `search_<name>(zip, specialty, plan)` function in `scraper/` that returns a list of
   provider dicts (same keys as `parse_healthnet_result` in `scraper/browserscraper.py`).
2. Register it in `SOURCES` in `script.py`, `server.js`, and `frontend/src/App.tsx`.
