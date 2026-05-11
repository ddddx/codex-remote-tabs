import type { ClientMessage } from '@codex-remote/protocol';
type WsLike = {
    send: (payload: string) => void;
};
export declare function routeClientMessage(socket: WsLike, message: ClientMessage): Promise<void>;
export {};
