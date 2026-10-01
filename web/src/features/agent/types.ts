export type ProviderId = 'deepseek' | 'glm';

export interface AgentSettings {
  provider: ProviderId;
  models: Record<ProviderId, string>;
  keys: Record<ProviderId, string>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  createdAt: number;
  status: 'complete' | 'streaming' | 'interrupted' | 'error';
  provider?: ProviderId;
  toolName?: string;
  toolCallId?: string;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
}
