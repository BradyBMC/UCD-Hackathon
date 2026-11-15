from google import genai
from browserscraper import scrape_healthnet
import time

# parameters that need to be filled
website = None
specialization = None
insurance = None

client = genai.Client(api_key="AQ.Ab8RN6J3Yezb6sjl3rsUHsp4tSqKqDV3nHTr6GUTRY-4IdPMxA")

def interpret_provider(text):

    prompt = f"""
    Extract provider information from this text. All results are already filtered to take the appropriate insurance.

    Return these fields:

    name
    specialty
    phone
    address
    insurance_plans
    accepting_new_patients
    referral_required

    For every field:
    - Use null if unknown.
    - Do not make assumptions.
    - Distinguish between insurance
      networks and specific insurance plans.
    - Preserve uncertainty.

    TEXT:
    {text}
    """

    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=prompt
    )

    return response.text

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

start = time.time()
print(f"Requesting processing by API")
print(interpret_provider(data))

end = time.time()
print(f"API time taken: {end - start}")