# shrimp runtime (mock)

In-memory FastAPI mock of [`docs/openapi.yaml`](../docs/openapi.yaml) plus a thin OpenAI-compatible `/v1` facade for Open WebUI.

内存 mock：无真实 LLM、不触发 cron、搜索不发外网；鉴权延后。

Listens on **8080**. Auth is deferred. State is process-local (the `./data` volume is mounted for later use; this slice does not persist).

## Run

From the repo root:

```bash
docker compose up --build runtime
```

Or the full stack (`ui` + `runtime` + `db`):

```bash
docker compose up --build
```

Open WebUI (`ui`) is already pointed at `http://runtime:8080/v1`.

Locally without Docker:

```bash
cd runtime
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080
```

## Curl examples

Assume the runtime is on `http://localhost:8080`.

```bash
# health
curl -sS http://localhost:8080/health

# create agent
AGENT=$(curl -sS -X POST http://localhost:8080/agents \
  -H 'content-type: application/json' \
  -d '{"name":"clerk","persona":"a terse harbor clerk"}')
echo "$AGENT"
AGENT_ID=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<<"$AGENT")

# list / get
curl -sS http://localhost:8080/agents
curl -sS "http://localhost:8080/agents/${AGENT_ID}"

# sync chat (omit conversation_id to start a new thread)
curl -sS -X POST "http://localhost:8080/agents/${AGENT_ID}/chat" \
  -H 'content-type: application/json' \
  -d '{"message":"any ships due?"}'

# create routine (stored as status=scheduled; cron does not fire)
ROUTINE=$(curl -sS -X POST http://localhost:8080/routines \
  -H 'content-type: application/json' \
  -d "{\"agent_id\":\"${AGENT_ID}\",\"cron\":\"0 9 * * *\",\"prompt\":\"summarize the dock\"}")
echo "$ROUTINE"
ROUTINE_ID=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<<"$ROUTINE")

# GET routine status (last_run_at / last_error stay null)
curl -sS "http://localhost:8080/routines/${ROUTINE_ID}"

# only tool: stub search (no outbound HTTP)
curl -sS -X POST http://localhost:8080/tools/search \
  -H 'content-type: application/json' \
  -d '{"query":"harbor weather"}'

# OpenAI facade — agents appear as models (id and name)
curl -sS http://localhost:8080/v1/models

# OpenAI facade — model may be agent id or name
curl -sS -X POST http://localhost:8080/v1/chat/completions \
  -H 'content-type: application/json' \
  -d "{\"model\":\"${AGENT_ID}\",\"messages\":[{\"role\":\"user\",\"content\":\"status?\"}]}"

curl -sS -X POST http://localhost:8080/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"clerk","messages":[{"role":"user","content":"status?"}]}'
```

`POST /v1/chat/completions` maps `model` onto the native chat turn and returns OpenAI-shaped JSON (`choices[0].message.content`). Embeddings, TTS, and other `/v1` routes are out of scope.

## Out of scope

- Real model calls
- Cron execution
- Auth
- A second admin UI
- Extra tools beyond `/tools/search`
