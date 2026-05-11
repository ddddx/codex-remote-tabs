export type ServerConfig = {
  host: string;
  port: number;
  wsToken: string;
  nodeEnv: string;
};

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(): ServerConfig {
  return {
    host: process.env.HOST || '127.0.0.1',
    port: parsePort(process.env.PORT, 18637),
    wsToken: process.env.WS_TOKEN || '',
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}
