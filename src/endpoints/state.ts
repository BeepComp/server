import { AuthLevels, Pointer } from "../modules/hono"
import rounds from "../rounds.json"
import metadata from "../signupMeta.json"

Pointer.GET(AuthLevels.ALL, `/state`, async (req, c, pack) => {

  // Round Information
  let id = null

  let currentRound = rounds.find((round, ind) => {
    let TOURNAMENT_EPOCH = Number(process.env.TOURNAMENT_EPOCH)
    let start = TOURNAMENT_EPOCH + (604800000 * ind)
    id = ind + 1

    return (Date.now() > start)
  })

  console.log(currentRound)

  let return_obj: any = {
    serverTime: Date.now(),
    started: (currentRound != null),
    currentRound: (currentRound == null ? null : Object.assign({id}, currentRound)),
  }

  // User Participant Stuff
  if (!return_obj.started) { return_obj["signupMeta"] = metadata }
  if (pack.user) {
    return_obj["user"] = pack.user
  }

  // In Valid Servers for Participation?
  return_obj["server_valid"] = false
  
  let res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${pack.auth_token}`
    }
  })

  let json: any[] = await res.json()
  
  if (Array.isArray(json)) {
    let VALID_SERVERS = (process.env.VALID_SERVERS?.split(",") || [])
    let server_valid = json.map((guild: any) => guild.id).some( (id: string) =>  VALID_SERVERS.includes(id))
    return_obj["server_valid"] = server_valid
  }
  
  return return_obj
})