function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required env var ${name}. Set it in .env.local — see .env.example.`,
    );
  }
  return v;
}

export function getVertexConfig() {
  return {
    project: required('VERTEX_PROJECT'),
    region: required('VERTEX_REGION'),
    agentEngineId: required('AGENT_ENGINE_ID'),
  };
}

export function getStreamQueryUrl(): string {
  const { project, region, agentEngineId } = getVertexConfig();
  return `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/reasoningEngines/${agentEngineId}:streamQuery`;
}
