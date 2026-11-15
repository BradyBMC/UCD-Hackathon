from google import genai

# parameters that need to be filled
website = None
specialization = None
insurance = None

client = genai.Client(api_key="YOUR_API_KEY")
# TODO: get an api key https://aistudio.google.com/docs

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=f"Scan link {website} for doctors in {specialization} who take {insurance}."
    # dynamically create a prompt based on parameters
)

# test print to make sure stuff works before we do anything with it
print(response.text)