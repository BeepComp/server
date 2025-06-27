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
    currentRound: id,
  }

  // User Participant Stuff
  if (!return_obj.started) { return_obj["signupMeta"] = metadata }
  if (pack.user) {
    return_obj["user"] = pack.user
  }

  // In Valid Servers for Participation?
  let {in_servers} = await pack.request_guilds()
  return_obj["server_valid"] = (in_servers.length > 0)
  
  return return_obj
})