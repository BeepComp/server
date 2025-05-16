import { AuthLevels, Pointer } from "../modules/hono"
import rounds from "../rounds.json"
import metadata from "../signupMeta.json"

Pointer.GET(AuthLevels.ALL, `/state`, (req, c, pack) => {
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

  if (!return_obj.started) { return_obj["signupMeta"] = metadata }
  if (pack.user) {
    return_obj["user"] = pack.user
  }
  
  return return_obj
})