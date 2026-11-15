"""Dummy search script called by server.js.

Usage: python3 script.py <zip> <specialty> <plan>

Prints one JSON object to stdout. Replace the body with the real scraper later.
"""
import sys
import json

zip_code, specialty, plan = (sys.argv[1:4] + ["", "", ""])[:3]

output_data = {
    "status": "success",
    "message": "Hello world",
    "params": {"zip": zip_code, "specialty": specialty, "plan": plan},
}

print(json.dumps(output_data))
