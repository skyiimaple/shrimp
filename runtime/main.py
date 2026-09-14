"""In-memory shrimp runtime mock + thin OpenAI /v1 facade.

No real LLM, cron firing, outbound search, or auth.
"""

from __future__ import annotations

import json
import threading
import time
import uuid
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic import BaseModel, Field

# --- models (native OpenAPI) -------------------------------------------------


class Agent(BaseModel):
    id: str
    name: str
    persona: str


class CreateAgent(BaseModel):
    name: str
    persona: str


class ChatTurnRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class ChatTurnResponse(BaseModel):
    conversation_id: str
    message: str


class Routine(BaseModel):
    id: str
    agent_id: str
    cron: str
    prompt: str
    status: Literal["scheduled", "idle", "error"]
    last_run_at: str | None
    last_error: str | None


class CreateRoutine(BaseModel):
    agent_id: str
    cron: str
    prompt: str


class SearchRequest(BaseModel):
    query: str


class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str | None = None


class SearchResponse(BaseModel):
    results: list[SearchResult]


class ErrorBody(BaseModel):
    error: str


# --- OpenAI facade shapes ----------------------------------------------------


class OpenAIMessage(BaseModel):
    role: str
    content: Any = None


class ChatCompletionsRequest(BaseModel):
    model: str
    messages: list[OpenAIMessage] = Field(default_factory=list)
    stream: bool = False


# --- in-memory store ---------------------------------------------------------


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _require_text(value: str | None, field: str) -> str:
    text = (value or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail=f"{field} is required")
    return text


def _fake_reply(agent: Agent, message: str) -> str:
    return (
        f"{agent.name} [{agent.persona}]: I read you — “{message}”. "
        "This is a mock turn; no LLM is called."
    )


class Store:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.agents: dict[str, Agent] = {}
        self.routines: dict[str, Routine] = {}
        self.conversations: dict[str, list[dict[str, str]]] = {}

    def list_agents(self) -> list[Agent]:
        with self._lock:
            return list(self.agents.values())

    def create_agent(self, body: CreateAgent) -> Agent:
        name = _require_text(body.name, "name")
        persona = _require_text(body.persona, "persona")
        agent = Agent(id=_new_id("agt"), name=name, persona=persona)
        with self._lock:
            self.agents[agent.id] = agent
        return agent

    def get_agent(self, agent_id: str) -> Agent:
        with self._lock:
            agent = self.agents.get(agent_id)
        if agent is None:
            raise HTTPException(status_code=404, detail="agent not found")
        return agent

    def resolve_agent(self, model: str) -> Agent:
        """Resolve by agent id, then by name."""
        key = (model or "").strip()
        if not key:
            raise HTTPException(status_code=400, detail="model is required")
        with self._lock:
            if key in self.agents:
                return self.agents[key]
            for agent in self.agents.values():
                if agent.name == key:
                    return agent
        raise HTTPException(status_code=404, detail="agent not found")

    def delete_agent(self, agent_id: str) -> None:
        with self._lock:
            if agent_id not in self.agents:
                raise HTTPException(status_code=404, detail="agent not found")
            del self.agents[agent_id]

    def chat(self, agent_id: str, body: ChatTurnRequest) -> ChatTurnResponse:
        agent = self.get_agent(agent_id)
        message = _require_text(body.message, "message")
        conversation_id = (body.conversation_id or "").strip() or _new_id("conv")
        reply = _fake_reply(agent, message)
        with self._lock:
            turns = self.conversations.setdefault(conversation_id, [])
            turns.append({"role": "user", "content": message})
            turns.append({"role": "assistant", "content": reply})
        return ChatTurnResponse(conversation_id=conversation_id, message=reply)

    def list_routines(self) -> list[Routine]:
        with self._lock:
            return list(self.routines.values())

    def create_routine(self, body: CreateRoutine) -> Routine:
        agent_id = _require_text(body.agent_id, "agent_id")
        cron = _require_text(body.cron, "cron")
        prompt = _require_text(body.prompt, "prompt")
        try:
            self.get_agent(agent_id)
        except HTTPException as exc:
            if exc.status_code == 404:
                raise HTTPException(status_code=400, detail="agent_id not found") from exc
            raise
        routine = Routine(
            id=_new_id("rtn"),
            agent_id=agent_id,
            cron=cron,
            prompt=prompt,
            status="scheduled",
            last_run_at=None,
            last_error=None,
        )
        with self._lock:
            self.routines[routine.id] = routine
        return routine

    def get_routine(self, routine_id: str) -> Routine:
        with self._lock:
            routine = self.routines.get(routine_id)
        if routine is None:
            raise HTTPException(status_code=404, detail="routine not found")
        return routine

    def delete_routine(self, routine_id: str) -> None:
        with self._lock:
            if routine_id not in self.routines:
                raise HTTPException(status_code=404, detail="routine not found")
            del self.routines[routine_id]


store = Store()


# --- app ---------------------------------------------------------------------

app = FastAPI(title="Shrimp Runtime API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _error(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message})


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "request failed"
    return _error(exc.status_code, detail)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    loc = ""
    if exc.errors():
        loc = ".".join(str(part) for part in exc.errors()[0].get("loc", []) if part != "body")
    message = f"invalid request: {loc}" if loc else "invalid request"
    return _error(400, message)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/agents", response_model=list[Agent])
def list_agents() -> list[Agent]:
    return store.list_agents()


@app.post("/agents", response_model=Agent, status_code=201)
def create_agent(body: CreateAgent) -> Agent:
    return store.create_agent(body)


@app.get("/agents/{id}", response_model=Agent)
def get_agent(id: str) -> Agent:
    return store.get_agent(id)


@app.delete("/agents/{id}", status_code=204)
def delete_agent(id: str) -> Response:
    store.delete_agent(id)
    return Response(status_code=204)


@app.post("/agents/{id}/chat", response_model=ChatTurnResponse)
def chat_with_agent(id: str, body: ChatTurnRequest) -> ChatTurnResponse:
    return store.chat(id, body)


@app.get("/routines", response_model=list[Routine])
def list_routines() -> list[Routine]:
    return store.list_routines()


@app.post("/routines", response_model=Routine, status_code=201)
def create_routine(body: CreateRoutine) -> Routine:
    return store.create_routine(body)


@app.get("/routines/{id}", response_model=Routine)
def get_routine(id: str) -> Routine:
    return store.get_routine(id)


@app.delete("/routines/{id}", status_code=204)
def delete_routine(id: str) -> Response:
    store.delete_routine(id)
    return Response(status_code=204)


@app.post("/tools/search", response_model=SearchResponse)
def search(body: SearchRequest) -> SearchResponse:
    query = _require_text(body.query, "query")
    slug = query.replace(" ", "-")[:48] or "query"
    return SearchResponse(
        results=[
            SearchResult(
                title=f"Stub result for “{query}”",
                url=f"https://example.invalid/search?q={slug}",
                snippet="Mock search hit. No outbound HTTP was made.",
            ),
            SearchResult(
                title="shrimp runtime (mock)",
                url="https://example.invalid/shrimp",
                snippet="In-memory /tools/search stub.",
            ),
        ]
    )


# --- /v1 OpenAI facade (Open WebUI) ------------------------------------------


def _message_text(content: Any) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and item.get("type", "text") == "text":
                parts.append(str(item.get("text") or ""))
        return " ".join(part for part in parts if part)
    return str(content)


def _last_user_text(messages: list[OpenAIMessage]) -> str:
    for msg in reversed(messages):
        if msg.role == "user":
            text = _message_text(msg.content).strip()
            if text:
                return text
    for msg in reversed(messages):
        text = _message_text(msg.content).strip()
        if text:
            return text
    raise HTTPException(status_code=400, detail="messages must include content")


def _openai_completion(model: str, content: str) -> dict[str, Any]:
    created = int(time.time())
    return {
        "id": _new_id("chatcmpl"),
        "object": "chat.completion",
        "created": created,
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
    }


def _openai_stream(model: str, content: str) -> StreamingResponse:
    created = int(time.time())
    completion_id = _new_id("chatcmpl")

    def chunks() -> Any:
        first = {
            "id": completion_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [
                {
                    "index": 0,
                    "delta": {"role": "assistant", "content": content},
                    "finish_reason": None,
                }
            ],
        }
        last = {
            "id": completion_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
        }
        yield f"data: {json.dumps(first, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps(last, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(chunks(), media_type="text/event-stream")


@app.get("/v1/models")
def list_models() -> dict[str, Any]:
    created = int(time.time())
    data = []
    for agent in store.list_agents():
        data.append(
            {
                "id": agent.id,
                "object": "model",
                "created": created,
                "owned_by": "shrimp",
                "name": agent.name,
            }
        )
        # Also expose the agent name so the Open WebUI picker is readable
        # and POST /v1/chat/completions can resolve either id or name.
        if agent.name != agent.id:
            data.append(
                {
                    "id": agent.name,
                    "object": "model",
                    "created": created,
                    "owned_by": "shrimp",
                }
            )
    return {"object": "list", "data": data}


@app.post("/v1/chat/completions")
def chat_completions(body: ChatCompletionsRequest) -> Any:
    agent = store.resolve_agent(body.model)
    message = _last_user_text(body.messages)
    turn = store.chat(agent.id, ChatTurnRequest(message=message))
    if body.stream:
        return _openai_stream(body.model, turn.message)
    return _openai_completion(body.model, turn.message)
