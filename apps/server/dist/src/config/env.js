function parsePort(value, fallback) {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function parsePositiveInteger(value, fallback) {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
export function loadConfig() {
    return {
        host: process.env.HOST || '127.0.0.1',
        port: parsePort(process.env.PORT, 18637),
        wsToken: process.env.WS_TOKEN || '',
        nodeEnv: process.env.NODE_ENV || 'development',
        maxImageUploadBytes: parsePositiveInteger(process.env.MAX_IMAGE_UPLOAD_BYTES, 15 * 1024 * 1024),
    };
}
//# sourceMappingURL=env.js.map