# main.py — FastAPI entry point
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class MessageRequest(BaseModel):
    message: str
    session_id: str

@app.post("/chat")
async def chat(req: MessageRequest):
    # TODO: wire up LangChain agent
    return {"reply": "Agent not yet connected."}

@app.post("/city-result")
async def city_result(req: MessageRequest):
    # TODO: trigger final city lookup + weather + image
    return {"city": None, "weather": None, "image": None, "description": None}
