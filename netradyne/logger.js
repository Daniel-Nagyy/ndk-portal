const levels = ['debug', 'info', 'warn', 'error'];
export const log = {
  debug: msg => console.debug(`[NETRADYNE] ${msg}`),
  info: msg => console.info(`[NETRADYNE] ${msg}`),
  warn: msg => console.warn(`[NETRADYNE] ${msg}`),
  error: msg => console.error(`[NETRADYNE] ${msg}`),
};