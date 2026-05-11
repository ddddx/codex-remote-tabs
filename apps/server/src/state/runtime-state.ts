export type RuntimeState = {
  startedAt: number;
  websocketClientCount: number;
  isShuttingDown: boolean;
};

export function createRuntimeState(): RuntimeState {
  return {
    startedAt: Date.now(),
    websocketClientCount: 0,
    isShuttingDown: false,
  };
}
