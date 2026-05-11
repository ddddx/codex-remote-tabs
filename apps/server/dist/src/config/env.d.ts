export type ServerConfig = {
    host: string;
    port: number;
    wsToken: string;
    nodeEnv: string;
    maxImageUploadBytes: number;
};
export declare function loadConfig(): ServerConfig;
