# tools.py — external API calls (weather, Unsplash, Wikipedia)
import os
import requests
from urllib.parse import quote

WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY")

def get_weather(city: str) -> dict:
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?q={quote(city)}&appid={WEATHER_API_KEY}&units=metric"
        res = requests.get(url, timeout=10)
        return res.json()
    except Exception as e:
        return {"error": str(e)}

def get_city_image(city: str) -> str:
    try:
        url = f"https://api.unsplash.com/search/photos?query={quote(city)}&client_id={UNSPLASH_ACCESS_KEY}&per_page=1"
        res = requests.get(url, timeout=10).json()
        return res["results"][0]["urls"]["regular"] if res.get("results") else None
    except Exception:
        return None

def get_city_description(city: str) -> str:
    try:
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote(city)}"
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            return res.json().get("extract", "")
        return ""
    except Exception:
        return ""
