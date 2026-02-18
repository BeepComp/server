import { DiscordBot2 } from "../modules/discord"
import { Global } from "../modules/global"

declare global {
  function print(...args: any[]): void
}

globalThis.print = (...args) => {
  console.log(...args)
  // if (process.env.ADMIN_TOKEN == "hi:3") {
    
  // }
  
  // Technically redundant but sometimes worker logs be tweaking
  // DiscordBot2.send_message_outer(`### ${Global["rid"]}\n\`\`\`ts\n${args.map(arg => JSON.stringify(arg, null, 2)).join("\n")}\n\`\`\``, "1392014737822187550")
}

export {}