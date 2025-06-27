declare global {
  function print(...args: any[]): void
}

globalThis.print = (...args) => {
  if (process.env.ADMIN_TOKEN == "hi:3") {
    console.log(...args)
  }
}

export {}