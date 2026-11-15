import re
import sys
import time

HEALTHNET_URL = "https://findaprovider.healthnetcalifornia.com/search-results"

PHONE_RE = re.compile(r"^\+?1?-?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$")
DISTANCE_RE = re.compile(r"^([\d.]+)\s+miles? away$", re.IGNORECASE)
VERIFIED_RE = re.compile(r"last verified or updated on\s+(\S+)", re.IGNORECASE)


def log(*args):
    # stdout is reserved for the JSON result consumed by server.js
    print(*args, file=sys.stderr)


def scrape_healthnet(zipcode, year, plan, specialty, headless=True):
    """Runs a Health Net provider search and returns the raw text of each result card."""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        try:
            page = browser.new_page()
            page.goto(HEALTHNET_URL, wait_until="domcontentloaded")

            page.get_by_label("Address, City, County or Zip Code").fill(zipcode)
            page.get_by_role("button", name="Continue").click()

            page.get_by_label(year).check()

            # Select insurance network
            page.get_by_label("Select your plan or network:").select_option(label=plan)
            page.get_by_role("button", name="Continue").click()

            search = page.get_by_role("combobox", name="Search by Specialty, Facility")
            search_button = page.get_by_role("button", name="Search")

            search.fill(specialty)
            page.get_by_role("listbox").wait_for(state="visible", timeout=5000)
            search.press("Escape")
            search_button.click()

            # Wait for results
            page.wait_for_load_state("domcontentloaded")
            page.wait_for_timeout(3000)

            providers = page.locator("search-result")
            count = providers.count()
            log("Providers found:", count)

            return [providers.nth(i).inner_text() for i in range(count)]
        finally:
            browser.close()


def parse_healthnet_result(text):
    """Turns the inner text of one Health Net result card into structured fields."""
    lines = [line.strip() for line in text.splitlines()]
    nonblank = [line for line in lines if line]

    result = {
        "name": None,
        "organization": None,
        "specialty": None,
        "address": None,
        "distance_miles": None,
        "phone": None,
        "accepting_new_patients": None,
        "primary_care_provider": None,
        "virtual_visits": None,
        "notes": [],
        "last_verified": None,
    }

    # Header: "This information was last verified..." / name / "Provider" / org / [notes] / specialty / <blank>
    # Walk the raw lines (not `nonblank`) so the blank line ending the header is visible
    start = next((k for k, line in enumerate(lines) if line), 0)
    verified = VERIFIED_RE.search(lines[start]) if lines else None
    if verified:
        result["last_verified"] = verified.group(1)
        start += 1
    header = []
    for line in lines[start:]:
        if not line:
            if header:
                break
            continue
        header.append(line)

    if header:
        result["name"] = header[0]
        rest = header[1:]
        if rest and rest[0].lower() == "provider":
            rest = rest[1:]
        if rest:
            result["organization"] = rest[0]
            rest = rest[1:]
        if rest:
            result["specialty"] = rest[-1]
            result["notes"].extend(rest[:-1])

    for k, line in enumerate(nonblank):
        prev = nonblank[k - 1].lower() if k > 0 else ""
        lower = line.lower()

        if lower.startswith("accessibility") and k > 0 and result["address"] is None:
            result["address"] = nonblank[k - 1]
        elif DISTANCE_RE.match(line):
            result["distance_miles"] = float(DISTANCE_RE.match(line).group(1))
        elif PHONE_RE.match(line) and result["phone"] is None:
            result["phone"] = line
        elif lower.startswith("leaving network"):
            result["notes"].append(line)
        elif lower == "accepting new patients":
            result["accepting_new_patients"] = True
        elif lower.startswith("not accepting new patients"):
            result["accepting_new_patients"] = False
        elif lower == "primary care provider":
            result["primary_care_provider"] = prev != "not"
        elif lower == "offers virtual visits":
            result["virtual_visits"] = prev != "not"

    return result


def search_healthnet(zipcode, specialty, plan, year=None, headless=True):
    year = year or str(time.localtime().tm_year)
    raw = scrape_healthnet(zipcode, year, plan, specialty, headless=headless)
    return [parse_healthnet_result(text) for text in raw]


if __name__ == "__main__":
    import json

    start = time.time()
    data = search_healthnet("95811", "Primary Care", "Medi-Cal", headless=False)
    log(f"Scraping time taken: {time.time() - start:.1f}s")
    print(json.dumps(data, indent=2))
