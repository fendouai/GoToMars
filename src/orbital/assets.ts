/** Standalone builds provide embedded resources. Normal web builds use local static files. */
export function assetURL(path:string){return (globalThis as typeof globalThis & {__MERIDIAN_ASSETS__?:Record<string,string>}).__MERIDIAN_ASSETS__?.[path]??path;}
