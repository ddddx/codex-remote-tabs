export function bootstrapServer(): string {
  return 'server scaffold';
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  console.log(bootstrapServer());
}
