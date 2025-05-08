declare global {
  function print(...args: any[]): void
}

globalThis.print = console.log

export {}