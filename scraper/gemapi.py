from google import genai
import time

# parameters that need to be filled
website = None
specialization = None
insurance = None

client = genai.Client(api_key="AQ.Ab8RN6JiMGbZPGBLSxC0uaotMBNtFVqCXIOtjPEUHEHNw-ARCw")

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

start = time.time()

text = None

print(interpret_provider(text))

end = time.time()
print(f"Time taken: {end - start}")