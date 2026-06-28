# main.py — FastAPI entry point
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from agent import chat, get_city_result
from tools import get_weather, get_city_image, get_city_description

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class MessageRequest(BaseModel):
    message:    str
    session_id: str
    image:      Optional[str]  = None  # base64 data URL, first message only
    telemetry:  Optional[dict] = None  # behavioral signals from frontend


@app.post("/chat")
async def chat_endpoint(req: MessageRequest):
    result = chat(req.session_id, req.message, req.image, req.telemetry)
    return result


@app.post("/city-result")
async def city_result_endpoint(req: MessageRequest):
    city_data = get_city_result(req.session_id)

    if "error" in city_data:
        return city_data

    city          = city_data.get("city")
    country       = city_data.get("country")
    weather_query = city_data.get("weather_query", city)

    weather     = get_weather(weather_query)
    image       = get_city_image(f"{city} city landscape")
    description = get_city_description(city)

    return {
        "city":        city,
        "country":     country,
        "reason":      city_data.get("reason"),
        "weather":     weather,
        "image":       image,
        "description": description,
    }
