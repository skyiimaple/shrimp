import type {
  Agent,
  ChatTurnRequest,
  CreateAgent,
  CreateRoutine,
  Routine,
  SearchRequest,
  ShrimpClient,
} from './types.ts'
import { ShrimpApiError } from './types.ts'

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
}

function requireText(value: string | undefined, field: string): string {
  const text = (value ?? '').trim()
  if (!text) {
    throw new ShrimpApiError(400, `${field} is required`)
  }
  return text
}

/**
 * In-browser stand-in for the four OpenAPI resources.
 * Local-only — does not talk to runtime. Seeded so the sketch is clickable.
 */
export function createMockClient(): ShrimpClient {
  const agents = new Map<string, Agent>()
  const routines = new Map<string, Routine>()
  const conversations = new Map<string, { agentId: string; turns: string[] }>()

  const seed = (name: string, persona: string): Agent => {
    const agent: Agent = { id: newId('agt'), name, persona }
    agents.set(agent.id, agent)
    return agent
  }
  seed('clerk', 'a terse harbor clerk')
  seed('researcher', 'cites sources, slightly pedantic')

  const getAgentOrThrow = (id: string): Agent => {
    const agent = agents.get(id)
    if (!agent) {
      throw new ShrimpApiError(404, 'agent not found')
    }
    return agent
  }

  return {
    async listAgents() {
      return [...agents.values()].map((a) => ({ ...a }))
    },
    async createAgent(body: CreateAgent) {
      const agent: Agent = {
        id: newId('agt'),
        name: requireText(body.name, 'name'),
        persona: requireText(body.persona, 'persona'),
      }
      agents.set(agent.id, agent)
      return { ...agent }
    },
    async getAgent(id) {
      return { ...getAgentOrThrow(id) }
    },
    async deleteAgent(id) {
      getAgentOrThrow(id)
      agents.delete(id)
    },
    async chat(agentId, body: ChatTurnRequest) {
      const agent = getAgentOrThrow(agentId)
      const message = requireText(body.message, 'message')
      const conversationId =
        (body.conversation_id ?? '').trim() || newId('conv')
      const reply = `${agent.name} [${agent.persona}]: I read you — “${message}”. This is a local mock turn; no runtime was called.`
      const conv = conversations.get(conversationId) ?? {
        agentId,
        turns: [],
      }
      conv.turns.push(message, reply)
      conversations.set(conversationId, conv)
      return { conversation_id: conversationId, message: reply }
    },
    async listRoutines() {
      return [...routines.values()].map((r) => ({ ...r }))
    },
    async createRoutine(body: CreateRoutine) {
      const agentId = requireText(body.agent_id, 'agent_id')
      getAgentOrThrow(agentId)
      const routine: Routine = {
        id: newId('rtn'),
        agent_id: agentId,
        cron: requireText(body.cron, 'cron'),
        prompt: requireText(body.prompt, 'prompt'),
        status: 'scheduled',
        last_run_at: null,
        last_error: null,
      }
      routines.set(routine.id, routine)
      return { ...routine }
    },
    async getRoutine(id) {
      const routine = routines.get(id)
      if (!routine) {
        throw new ShrimpApiError(404, 'routine not found')
      }
      return { ...routine }
    },
    async deleteRoutine(id) {
      if (!routines.has(id)) {
        throw new ShrimpApiError(404, 'routine not found')
      }
      routines.delete(id)
    },
    async search(body: SearchRequest) {
      const query = requireText(body.query, 'query')
      const slug = query.replace(/\s+/g, '-').slice(0, 48) || 'query'
      return {
        results: [
          {
            title: `Stub result for “${query}”`,
            url: `https://example.invalid/search?q=${slug}`,
            snippet: 'Local mock search hit. No outbound HTTP was made.',
          },
        ],
      }
    },
  }
}
