declare module 'vitest' {
  export const vi: any
  export const describe: any
  export const it: any
  export const expect: any
  export const afterEach: any
}

declare module 'vitest/config' {
  export function defineConfig(config: any): any
}
