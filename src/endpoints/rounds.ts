import { AuthLevels, Pointer } from "../modules/hono"
import rounds from "../rounds.json"
import { Round } from "@beepcomp/core"

const ROUND_STATES: ("OPEN" | "VOTE" | "DONE")[] = [
  "DONE",
  "VOTE",
  "OPEN",
]

rounds.forEach((round, ind) => {
  let id = ind + 1
  let TOURNAMENT_EPOCH = Number(process.env.TOURNAMENT_EPOCH)
  let start = TOURNAMENT_EPOCH + (604800000 * ind)
  let vote = start + 604800000 // I should just make a week constant tbhh
  let end = vote + 604800000
  let times = [ 
    end,
    vote,
    start,
  ]

  // print(start)
  // print(Date.now())
  // print(Date.now() - start)
  
  Pointer.GET(AuthLevels.ALL, `/rounds/${id}`, (req, c, pack) => {
    let now = Date.now()
    let ind = times.findIndex(time => now > time)
    let curr = times[ind]
    let next = curr + 604800000
    let current_state: "NONE" | "OPEN" | "VOTE" | "DONE" = ROUND_STATES[ind]

    let returned_round: Round = Object.assign({id, start, vote, end, curr, next, current_state}, round)
    return returned_round
  }, start)
})