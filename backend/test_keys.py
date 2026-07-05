import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# Test OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
try:
    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Say OK"}]
    )
    print("OpenAI ✅", res.choices[0].message.content)
except Exception as e:
    print("OpenAI ❌", e)
