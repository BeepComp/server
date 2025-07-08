import { DiscordBot2 } from "../modules/discord"

declare global {
  function print(...args: any[]): void
}

globalThis.print = (...args) => {
  console.log(...args)
  // if (process.env.ADMIN_TOKEN == "hi:3") {
    
  // }

  // DiscordBot2.send_message_outer(`\`\`\`ts\n${args.map(arg => JSON.stringify(arg, null, 2)).join("\n")}\n\`\`\``, "1392014737822187550")
}

export {}