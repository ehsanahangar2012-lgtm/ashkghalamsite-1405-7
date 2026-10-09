export default typeof window !== 'undefined' ? window.fetch.bind(window) : (typeof globalThis !== 'undefined' ? (globalThis as any).fetch : undefined);
export const Headers = typeof window !== 'undefined' ? window.Headers : (typeof globalThis !== 'undefined' ? (globalThis as any).Headers : undefined);
export const Request = typeof window !== 'undefined' ? window.Request : (typeof globalThis !== 'undefined' ? (globalThis as any).Request : undefined);
export const Response = typeof window !== 'undefined' ? window.Response : (typeof globalThis !== 'undefined' ? (globalThis as any).Response : undefined);
