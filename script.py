"""Provider search entry point called by server.js.

Usage: python3 script.py <zip> <specialty> <plan> <source>

Prints one JSON object to stdout. Logs go to stderr.
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "scraper"))

from browserscraper import search_healthnet  # noqa: E402

# source id -> search function(zip, specialty, plan) returning a list of provider dicts.
# Add new scrapers here and to SOURCES in server.js / frontend/src/App.tsx.
SOURCES = {
    "healthnet": search_healthnet,
}


def main():
    zip_code, specialty, plan, source = (sys.argv[1:5] + [""] * 4)[:4]
    params = {"zip": zip_code, "specialty": specialty, "plan": plan, "source": source}

    search = SOURCES.get(source)
    if search is None:
        print(json.dumps({"status": "error", "message": f"Unknown source: {source}", "params": params}))
        sys.exit(1)

    providers = search(zip_code, specialty, plan)
    print(json.dumps({
        "status": "success",
        "message": f"Found {len(providers)} provider{'' if len(providers) == 1 else 's'}",
        "params": params,
        "providers": providers,
    }))


if __name__ == "__main__":
    main()
