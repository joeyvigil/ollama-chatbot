from collections.abc import AsyncIterator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_ollama import ChatOllama

from app.config import get_settings

ROLE_MAP = {
    "user": HumanMessage,
    "assistant": AIMessage,
    "system": SystemMessage,
}


def get_llm() -> ChatOllama:
    settings = get_settings()
    return ChatOllama(
        model=settings["ollama_model"],
        base_url=settings["ollama_base_url"],
        temperature=0.7,
    )


def to_langchain_messages(messages: list[dict[str, str]]):
    converted = []
    for message in messages:
        role = message.get("role", "user")
        content = message.get("content", "")
        message_cls = ROLE_MAP.get(role, HumanMessage)
        converted.append(message_cls(content=content))
    return converted


async def stream_chat(messages: list[dict[str, str]]) -> AsyncIterator[str]:
    llm = get_llm()
    async for chunk in llm.astream(to_langchain_messages(messages)):
        if chunk.content:
            yield chunk.content
