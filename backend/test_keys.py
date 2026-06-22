import os, requests
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

# Test WeatherAPI
key = os.getenv("WEATHER_API_KEY")
try:
    res = requests.get(f"https://api.openweathermap.org/data/2.5/weather?q=London&appid={key}&units=metric")
    data = res.json()
    if "main" in data:
        print("OpenWeatherMap ✅", data["name"], data["main"]["temp"], "°C")
    else:
        print("OpenWeatherMap ❌", data)
except Exception as e:
    print("WeatherAPI ❌", e)

# Test Unsplash
key = os.getenv("UNSPLASH_ACCESS_KEY")
try:
    res = requests.get(f"https://api.unsplash.com/search/photos?query=Tokyo&per_page=1&client_id={key}")
    data = res.json()
    if "results" in data and len(data["results"]) > 0:
        print("Unsplash ✅", data["results"][0]["urls"]["regular"][:60], "...")
    else:
        print("Unsplash ❌", data)
except Exception as e:
    print("Unsplash ❌", e)
