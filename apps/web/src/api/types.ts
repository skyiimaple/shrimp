/** Shapes from docs/openapi.yaml (agents, chat, routines, /tools/search). */

export type Agent = {
  id: string
  name: string
  persona: string
}

export type CreateAgent = {
  name: string
  persona: string
}

export type ChatTurnRequest = {
  message: string
  conversation_id?: string
}

export type ChatTurnResponse = {
  conversation_id: string
  message: string
}

export type RoutineStatus = 'scheduled' | 'idle' | 'error'

export type Routine = {
  id: string
  agent_id: string
  cron: string
  prompt: string
  status: RoutineStatus
  last_run_at: string | null
  last_error: string | null
}

export type CreateRoutine = {
  agent_id: string
  cron: string
  prompt: string
}

export type SearchResult = {
  title: string
  url: string
  snippet?: string
}

export type SearchRequest = {
  query: string
}

export type SearchResponse = {
  results: SearchResult[]
}

export type ErrorBody = {
  error: string
}

export class ShrimpApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ShrimpApiError'
    this.status = status
  }
}

/** Native shrimp resources only — never /v1/*. */
export type ShrimpClient = {
  listAgents: () => Promise<Agent[]>
  createAgent: (body: CreateAgent) => Promise<Agent>
  getAgent: (id: string) => Promise<Agent>
  deleteAgent: (id: string) => Promise<void>
  chat: (agentId: string, body: ChatTurnRequest) => Promise<ChatTurnResponse>
  listRoutines: () => Promise<Routine[]>
  createRoutine: (body: CreateRoutine) => Promise<Routine>
  getRoutine: (id: string) => Promise<Routine>
  deleteRoutine: (id: string) => Promise<void>
  search: (body: SearchRequest) => Promise<SearchResponse>
}
