# agent.py — LangChain conversational agent with memory + vision
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from dotenv import load_dotenv
import os, json

load_dotenv()

# gpt-4o required for vision (image input)
llm = ChatOpenAI(model="gpt-4o", temperature=0.7)

# Store message history per session: { session_id: [HumanMessage, AIMessage, ...] }
session_memories: dict[str, list] = {}

SYSTEM_PROMPT = """You help people discover which city best matches their mood — through a drawing they made and a short chat.

Rules:
- Keep every reply to 1–2 short sentences max.
- Ask exactly one question per reply. Never ask two at once.
- After 3–5 exchanges, once you have enough to pick a city, append READY:true at the end of your message.
- Warm but brief. No filler phrases like "That's interesting!" or "Great answer!"."""


def get_or_create_memory(session_id: str) -> list:
    if session_id not in session_memories:
        session_memories[session_id] = []
    return session_memories[session_id]


def chat(session_id: str, user_message: str, image_base64: str = None) -> dict:
    history = get_or_create_memory(session_id)

    # First message with drawing image
    if image_base64 and len(history) == 0:
        content = [
            {
                "type": "text",
                "text": "The user has drawn something. Look at the drawing carefully — the shapes, energy, colors. Start the conversation by making one warm observation about what you see, then ask one question to understand their mood or personality better. Keep it short."
            },
            {
                "type": "image_url",
                "image_url": {"url": image_base64}
            }
        ]
        human_msg = HumanMessage(content=content)
        history_label = "[User shared a drawing]"
    else:
        human_msg = HumanMessage(content=user_message)
        history_label = user_message

    messages = [SystemMessage(content=SYSTEM_PROMPT)] + history + [human_msg]
    response  = llm.invoke(messages)
    reply     = response.content

    ready       = "READY:true" in reply
    clean_reply = reply.replace("READY:true", "").strip()

    # Store a text label in history (not the raw image bytes)
    history.append(HumanMessage(content=history_label))
    history.append(AIMessage(content=clean_reply))

    return {"reply": clean_reply, "ready": ready}


def get_city_result(session_id: str) -> dict:
    history = get_or_create_memory(session_id)

    city_prompt = SystemMessage(content="""Based on the conversation and drawing so far, select the ONE city in the world that best matches this person's mood, personality, and inner world.

Consider: temperature feel, weather (sun/cloud/rain/wind), cultural vibe, pace of life, and the city's character and history.

Respond with ONLY a valid JSON object — no markdown, no extra text:
{
  "city": "City Name",
  "country": "Country Name",
  "reason": "One evocative sentence explaining why this city matches them",
  "weather_query": "City Name, Country Code"
}""")

    messages = [city_prompt] + history
    response  = llm.invoke(messages)

    try:
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content.strip())
    except Exception as e:
        return {"error": str(e), "raw": response.content}
