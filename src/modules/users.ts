import { AxiosError } from "axios"
import { DB } from "./db"
import { GuildBot } from "./discord"
import { Global } from "./global"
import { eq } from "drizzle-orm"
import { users } from "../db/schema"

export async function _cacheDiscordMembers(overwrite = false) {
  const BEEPCOMP: KVNamespace = Global.BEEPCOMP

  let discord_members_string = null
  if (BEEPCOMP != undefined) { discord_members_string = await BEEPCOMP.get("discord_members") }

  if (discord_members_string == null || overwrite) {
    let discord_members: any[] = []
    let discord_user_ids = new Set()
    // let discord_members: any[] = []
    let guilds_ids = process.env.VALID_SERVERS.split(",")
    for (let ind = 0; ind < guilds_ids.length; ind++) {
      const guild_id = guilds_ids[ind];

      let res_count = -1
      let last_id: any = null
      let id_mixup = false
      let last_id_count = 0
      while (res_count == -1 || res_count == 1000 || id_mixup) {
        let members: any[] = []

        async function getmembers() {
          let res = await GuildBot(guild_id).GET(`/guilds/${guild_id}/members?limit=1000${(last_id != null) ? `&after=${last_id}` : ""}`)

          if (res instanceof AxiosError) {
            print(`Axios Error: `, res)
            if (res.status == 429) {
              await new Promise<void>((reso, rej) => {
                setTimeout(async () => {
                  await getmembers()
                  reso()
                }, (res.response?.data?.retry_after || 5) * 1000)
              })
            } else {
              members = []
            }
          } else {
            members = res
            // await new Promise<void>((reso, rej) => { setTimeout(reso, ((members.length / 1000) * 3000)) })
          }
        }

        await getmembers()
        if (members == null) { members = [] }

        members.forEach(member => discord_user_ids.add(member.user.id))
        discord_members = discord_members.concat(members)
        if (discord_user_ids.size > last_id_count) {
          id_mixup = false
          last_id_count = discord_user_ids.size
        } else {
          id_mixup = true
        }

        last_id = members[Math.max(members.length-1, 0)]?.user?.id
        res_count = members.length
        print(`members[${ind}]: `, members)
        print(`last_id: `, last_id)
        print(`discord_user_ids: `, discord_user_ids)
      }
    }

    await BEEPCOMP.put("discord_members", JSON.stringify(discord_members), {expirationTtl: 70000})

    return discord_members
  } else {
    let discord_members: any[] = JSON.parse(discord_members_string)
    
    return discord_members
  }
}

export async function getAllUsers() {
  const db = DB()

  // DiscordBot.GET(`/users/${process.env.DISCORD_CLIENT_ID}`).then(console.log) // who tf are you

  // let member_proms = process.env.VALID_SERVERS.split(",").map(guild_id => {
  //   return DiscordBot.GET(`/guilds/${guild_id}/members?limit=1000`)
  // })

  // let proms = await Promise.all([
  //   db.query.users.findMany(),
  //   ...member_proms
  // ])

  // print("proms: ", proms)

  const users = await db.query.users.findMany()
  // let discord_members = proms.slice(1, proms.length).reduce((entry, last) => (entry || []).concat(last || []))
  let discord_members = await _cacheDiscordMembers()

  // print(discord_members)
  
  let returned_users = users.filter(user => user.participant).map(user => {
    let discord_user = (discord_members.find((this_member: any) => this_member.user.id == user.id)?.user)
    return Object.assign(user, discord_user, {valid: (discord_user != null)})
  })

  return returned_users
}

export async function getUser(id: string) {
  const db = DB()

  // DiscordBot.GET(`/users/${process.env.DISCORD_CLIENT_ID}`).then(console.log) // who tf are you

  // let member_proms = process.env.VALID_SERVERS.split(",").map(guild_id => {
  //   return DiscordBot.GET(`/guilds/${guild_id}/members?limit=1000`)
  // })

  // let proms = await Promise.all([
  //   db.query.users.findMany(),
  //   ...member_proms
  // ])

  // print("proms: ", proms)

  const user = await db.query.users.findFirst({where: eq(users.id, id)})
  if (user == undefined) { return null }
  // let discord_members = proms.slice(1, proms.length).reduce((entry, last) => (entry || []).concat(last || []))
  let discord_members = await _cacheDiscordMembers()
  let discord_user = discord_members.find(member => member.user.id == id)?.user

  return Object.assign(user, discord_user)
}