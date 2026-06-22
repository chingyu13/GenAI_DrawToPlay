# tools.py — external API calls (weather, Unsplash, Wikipedia)
import os
import requests

WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY")

def get_weather(city: str) -> dict:
    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={WEATHER_API_KEY}&units=metric"
    res = requests.get(url)
    return res.json()

def get_city_image(city: str) -> str:
    url = f"https://api.unsplash.com/search/photos?query={city}&client_id={UNSPLASH_ACCESS_KEY}&per_page=1"
    res = requests.get(url).json()
    return res["results"][0]["urls"]["regular"] if res["results"] else None

def get_city_description(city: str) -> str:
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{city}"
    res = requests.get(url).json()
    return res.get("extract", "")
