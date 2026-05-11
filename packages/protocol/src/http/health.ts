export type HealthResponse = {
  status: 'ok' | 'shutting_down';
  tabs: number;
  websocketClients: number;
  uptimeSec: number;
};
