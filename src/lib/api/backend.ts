export type ChatBackend = 'gcp' | 'local';

export function getChatBackend(): ChatBackend {
  return process.env.CHAT_BACKEND === 'local' ? 'local' : 'gcp';
}

export function getLocalBackendUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
}

/**
 * The agent backend picked in the chat UI. Both speak the ADK serving wire
 * contract (the python backend implements it via its adk_parity router), so
 * the only difference between them is the base URL they are served on.
 */
export type AgentBackend = 'adk' | 'python';

export function isAgentBackend(value: unknown): value is AgentBackend {
  return value === 'adk' || value === 'python';
}

/** Base URL of the python (FastAPI) parity agent server. */
export function getPythonBackendUrl(): string {
  return process.env.PYTHON_BACKEND_URL ?? 'http://localhost:8000';
}

/** Base URL of the agent server for a UI-selected backend. */
export function getAgentBackendUrl(backend: AgentBackend): string {
  return backend === 'python' ? getPythonBackendUrl() : getLocalBackendUrl();
}

export function logChatBackend(): void {
  const backend = getChatBackend();
  const target =
    backend === 'local' ? getLocalBackendUrl() : 'Vertex AI Agent Engine (GCP)';
  console.log(`[medaid] chat backend: ${backend} -> ${target}`);
}
