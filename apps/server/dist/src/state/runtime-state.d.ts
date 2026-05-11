export type RuntimeState = {
    startedAt: number;
    websocketClientCount: number;
    isShuttingDown: boolean;
};
export declare function createRuntimeState(): RuntimeState;
