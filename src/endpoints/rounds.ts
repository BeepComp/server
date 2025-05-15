import { AuthLevels, Pointer } from "../modules/hono"
import rounds from "../rounds.json"

rounds.forEach((round, ind) => {
  let id = ind + 1
  let TOURNAMENT_EPOCH = Number(process.env.TOURNAMENT_EPOCH)
  let start = TOURNAMENT_EPOCH + (604800000 * ind)

  // print(start)
  // print(Date.now())
  // print(Date.now() - start)
  
  Pointer.GET(AuthLevels.ALL, `/rounds/${id}`, (req, c, pack) => {
    return { round: Object.assign({id, start}, round), rid: pack.rid }
  }, start)
})