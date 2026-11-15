from playwright.sync_api import sync_playwright
import time

def scrape_healthnet(zipcode, year, plan, specialty):

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)

        page = browser.new_page()

        page.goto(
            "https://findaprovider.healthnetcalifornia.com/search-results",
            wait_until="domcontentloaded"
        )

        # Inspect the page before interacting
        print(page.locator("body").inner_text())

        # Example interactions (replace selectors
        # with the actual ones from the website)

        page.get_by_label("Address, City, County or Zip Code").fill(zipcode)
        page.get_by_role("button", name="Continue").click()

        page.get_by_label(year).check()

        # Select insurance network
        page.get_by_label(
            "Select your plan or network:"
        ).select_option(label=plan)
        page.get_by_role("button", name="Continue").click()

        search = page.get_by_role(
            "combobox",
            name="Search by Specialty, Facility"
        )
        searchButton = page.get_by_role("button", name="Search")

        search.fill(specialty)
        
        suggestions = page.get_by_role("listbox")
        suggestions.wait_for(state="visible", timeout=5000)
        
        search.press("Escape")
        
        searchButton.click()

        # Wait for results
        page.wait_for_load_state("domcontentloaded")

        page.wait_for_timeout(3000)

        providers = page.locator("search-result")

        print("Providers found:", providers.count())

        results = []
        for i in range(providers.count()):
            provider = providers.nth(i)
            print(f"Provider {i}:")
            print((provider.inner_text()))
            results.append(provider.inner_text())

        browser.close()

        return results

zip = "95811"
year = "2026"
plan = "Medi-Cal"
specialty = "Primary Care"

print(f"Starting program")
start = time.time()
data = scrape_healthnet(zip, year, plan, specialty)
end = time.time()
print(data)
print(f"Scraping time taken: {end - start}")

with open("output.txt", "w", encoding="utf-8") as file:
    for item in data:
        file.write(f"{item}\n")