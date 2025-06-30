import axios, { type AxiosInstance } from "axios";

// import TaskManager from "task-manager";
// const Queue = new TaskManager()

export function GuildBot(guild_id: string) {
  const BOT_1_SERVERS = (process.env.BOT_1_SERVERS).split(",")
  const BOT_2_SERVERS = (process.env.BOT_2_SERVERS).split(",")
  
  if (BOT_1_SERVERS.includes(guild_id)) { return DiscordBot } // Not redundant, just priority based
  if (BOT_2_SERVERS.includes(guild_id)) { return DiscordBot2 }

  return DiscordBot
}

class DiscordBotClass {
  _axios: AxiosInstance;
  constructor(token: string) {
    this._axios = axios.create({
      baseURL: "https://discord.com/api/v10/",
      headers: {
        "Authorization": `Bot ${token}` 
      }
    })
  }
  
  async _base_request(method: ("GET" | "POST" | "PATCH" | "PUT" | "DELETE"), url: string, data: object) {
    let headers: any = {}
    // print(`discord bot ${method} ${url}`)

    try {
      let res = await this._axios({ url, method, headers, data: ((method == "GET") ? undefined : data) })
      // print("discord bot res: ", res)

      return res.data
    } catch(err) {
      // print("discord bot error kys: ", err)
      return err
    }
  }

  async GET(path: string, body: object = {}) {
    return this._base_request("GET", path, body)
  }

  async POST(path: string, body: object = {}) {
    return this._base_request("POST", path, body)
  }

  async PATCH(path: string, body: object = {}) {
    return this._base_request("PATCH", path, body)
  }

  async PUT(path: string, body: object = {}) {
    return this._base_request("PUT", path, body)
  }

  async DELETE(path: string, body: object = {}) {
    return this._base_request("DELETE", path, body)
  }

  send_message(content: String, announcement: boolean = true) {
    return this.POST(`/channels/${announcement ? process.env.DISCORD_ANNOUNCEMENT_CHANNEL : process.env.DISCORD_CHAT_CHANNEL}/messages`, {content})
  }

  send_message_outer(content: String, channel_id: string) {
    return this.POST(`/channels/${channel_id}/messages`, {content})
  }

  give_role(member_id: String) {
    return this.PUT(`/guilds/${process.env.MAIN_SERVER}/members/${member_id}/roles/${process.env.DISCORD_ROLE}`)
  }

  remove_role(member_id: String) {
    return this.DELETE(`/guilds/${process.env.MAIN_SERVER}/members/${member_id}/roles/${process.env.DISCORD_ROLE}`)
  }
}

export const DiscordBot = new DiscordBotClass(process.env.DISCORD_TOKEN)
export const DiscordBot2 = new DiscordBotClass(process.env.DISCORD_TOKEN_2)

class DiscordWebHookClass {
  _axios: AxiosInstance;
  constructor() {
    this._axios = axios.create({
      url: process.env.COOL_CHAT_WEBHOOK
    })
  }
  
  async _base_request(method: ("GET" | "POST" | "PATCH" | "PUT" | "DELETE"), data: object, announce: boolean = false) {
    let headers: any = {}

    let res = await this._axios({ url: (announce ? process.env.COOL_ANNOUNCEMENT_WEBHOOK : process.env.COOL_CHAT_WEBHOOK), method, headers, data })

    return res.data
  }

  async GET(body: object = {}, announce = false) {
    return this._base_request("GET", body, announce)
  }

  async POST(body: object = {}, announce = false) {
    return this._base_request("POST", body, announce)
  }

  async PATCH(body: object = {}, announce = false) {
    return this._base_request("PATCH", body, announce)
  }

  async PUT(body: object = {}, announce = false) {
    return this._base_request("PUT", body, announce)
  }

  async DELETE(body: object = {}, announce = false) {
    return this._base_request("DELETE", body, announce)
  }

  send_message(content: String, announce = false) {
    return this.POST({content}, announce)
  }
}

export const DiscordWebHook = new DiscordWebHookClass()

// import { Client, Events, GatewayIntentBits } from 'discord.js';

// const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// client.on(Events.ClientReady, readyClient => {
//   console.log(`Logged in as ${readyClient.user.tag}!`);
// });

// client.on(Events.InteractionCreate, async interaction => {
//   if (!interaction.isChatInputCommand()) return;

//   if (interaction.commandName === 'ping') {
//     await interaction.reply('Pong!');
//   }
// });

// print("token: ", process.env.DISCORD_TOKEN)

// client.login(process.env.DISCORD_TOKEN);
