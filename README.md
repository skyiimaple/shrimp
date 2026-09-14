# shrimp

Single-node self-host skeleton. This slice lands compose + the HTTP contract only.

- [`docker-compose.yml`](./docker-compose.yml) — `ui` (Open WebUI), `runtime` (placeholder on `:8080`), `db` (SQLite on host `./data`). Postgres is a later option; not in v1.
- [`docs/openapi.yaml`](./docs/openapi.yaml) — OpenAPI 3.0.3 for agents, sync chat, routines, and the search tool.

A mock runtime that actually serves the OpenAPI is a follow-up PR. Auth, scheduler, and a second admin UI are out of scope here.
