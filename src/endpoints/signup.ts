import { modifiers, users } from "../db/schema";
import { DB } from "../modules/db";
import { DiscordBot, DiscordWebHook } from "../modules/discord";
import { AuthLevels, Pointer } from "../modules/hono";
import snowflake from "../modules/snowflake";
import metadata from "../signupMeta.json"

Pointer.GET(AuthLevels.ALL, `/signup/meta`, (req, c, pack) => {
  return metadata
})

// Pointer.POST(AuthLevels.ONLY_DISCORD, `/join_beepcord`, async (req, c, pack) => {
//   if (pack.user == null) { return false }
//   /// /guilds/{guild.id}/members/{user.id}
//   let res = await fetch(`https://discord.com/api/v10/guilds/${process.env.MAIN_SERVER}/members/${pack.user.id}`, {
//     method: "PUT",
//     headers: {
//       Authorization: `Bearer ${pack.auth_token}`
//     }
//   })

//   let json = await res.json()
//   print(json)

//   return true
// })

Pointer.POST(AuthLevels.ONLY_DISCORD, `/signup`, async (req, c, pack) => {
  let TOURNAMENT_EPOCH = Number(process.env.TOURNAMENT_EPOCH)
  console.log("TOURNAMENT_EPOCH: ", TOURNAMENT_EPOCH)

  if (pack.user == null) { return new Error("User Object Missing?") }

  if (Date.now() > TOURNAMENT_EPOCH) { return new Error("Too late... stupid") }

  let {noun, verb, adjective} = await req.json()
  const db = DB(c)

  // Make User
  let newUser = await db.insert(users).values({id: pack.user.id, participant: true})

  // Make Modifiers
  let promNounModifier = db.insert(modifiers).values({
    id: snowflake(),
    type: "noun",
    text: noun,
    submitter: pack.user.id
  })
  let promVerbModifier = db.insert(modifiers).values({
    id: snowflake(),
    type: "verb",
    text: verb,
    submitter: pack.user.id
  })
  let promAdjectiveModifier = db.insert(modifiers).values({
    id: snowflake(),
    type: "adjective",
    text: adjective,
    submitter: pack.user.id
  })

  let res = await Promise.all([
    promNounModifier,
    promVerbModifier,
    promAdjectiveModifier
  ])

  // In Valid Servers for Participation?
  let {in_servers, main_server} = await pack.request_guilds()

  print("in_servers: ", in_servers.join(", "))
  print("main_server: ", main_server)

  let final_proms = []
  if (in_servers.length > 0) {
    if (main_server) {
      let res1 = DiscordBot.send_message(`### Welcome in, <@${pack.user.id}>!`, false)
      final_proms.push(res1)

      let res2 = DiscordBot.give_role(pack.user.id)
      final_proms.push(res2)
    } else {
      let res1 = DiscordWebHook.send_message(`### Welcome in, <@${pack.user.id}>!`)
      final_proms.push(res1)
    }
    
    await Promise.all(final_proms)
  }

  return [newUser].concat(res)
})