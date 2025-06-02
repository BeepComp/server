import axios, { type AxiosInstance } from "axios";

class DiscordBotClass {
  _axios: AxiosInstance;
  constructor() {
    this._axios = axios.create({
      baseURL: "https://discord.com/api/v10/",
      headers: {
        "Authorization": `Bot ${process.env.DISCORD_TOKEN}` 
      }
    })
  }
  
  async _base_request(method: ("GET" | "POST" | "PATCH" | "PUT" | "DELETE"), url: string, data: object) {
    let headers: any = {}

    let res = await this._axios({ url, method, headers, data })

    return res.data
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

  give_role(member_id: String) {
    return this.PUT(`/guilds/${process.env.MAIN_SERVER}/members/${member_id}/roles/${process.env.DISCORD_ROLE}`)
  }

  remove_role(member_id: String) {
    return this.DELETE(`/guilds/${process.env.MAIN_SERVER}/members/${member_id}/roles/${process.env.DISCORD_ROLE}`)
  }
}

export const DiscordBot = new DiscordBotClass()

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
