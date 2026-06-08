import json
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.chain import stream_chat
from app.config import get_settings

app = FastAPI(title="Ollama Chatbot API", version="1.0.0")

settings = get_settings()
_cors_origins = settings["cors_origins"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials="*" not in _cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"] = "user"
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "model": settings["ollama_model"],
        "ollama_base_url": settings["ollama_base_url"],
    }


@app.post("/api/chat")
async def chat(request: ChatRequest):
    messages = [message.model_dump() for message in request.messages]

    async def event_stream():
        try:
            async for token in stream_chat(messages):
                payload = json.dumps({"content": token})
                yield f"data: {payload}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            payload = json.dumps({"error": str(exc)})
            yield f"data: {payload}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
