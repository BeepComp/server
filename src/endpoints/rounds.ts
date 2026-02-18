import { AuthLevels, Pointer } from "../modules/hono"
import rounds from "../rounds.json"
import { Round } from "@beepcomp/core"

const ROUND_STATES: ("OPEN" | "VOTE" | "DONE")[] = [
  "DONE",
  "VOTE",
  "OPEN",
]

const WEEK = 604800000

export function getRoundTimes(id: number) {
  let ind = id - 1;

  let TOURNAMENT_EPOCH = Number(process.env.TOURNAMENT_EPOCH)
  let start = 0

  TOURNAMENT_EPOCH + (WEEK * ind) + (id < 5 ? 0 : WEEK)

  if (id >= 5) {
    start = (TOURNAMENT_EPOCH + (WEEK * 5)) + ((id - 5) * (WEEK * 2))
  } else {
    start = TOURNAMENT_EPOCH + (WEEK * ind)
  }

  let vote = start + WEEK // I should just make a week constant tbhh
  let end = vote + WEEK
  // if (Date.now() > start) {
  //   id = ind + 1
  //   break
  // }

  return {start, vote, end}
}

export function getCurrentRound(state: "start" | "vote" | "end" = "start", time: number = Date.now()) {
  let id = 0
  for (let ind = rounds.length - 1; ind >= 0; ind--) {
    id = ind + 1
    let times = getRoundTimes(id)
    if (time > times[state]) {
      break
    }
  }

  return getRoundsObj(id)
}

export function getRoundsObj(id: number): Round | null {
  let ind = id - 1
  let round = rounds[ind]

  let {start, vote, end} = getRoundTimes(id)
  let times = [ 
    end,
    vote,
    start,
  ]

  if (round) {
    let now = Date.now()
    let ind = times.findIndex(time => now > time)
    let curr = times[ind]
    let next = curr + WEEK
    let current_state: "NONE" | "OPEN" | "VOTE" | "DONE" = ROUND_STATES[ind]

    let returned_round: Round = Object.assign({id, start, vote, end, curr, next, current_state}, round)
    return returned_round
  } else {
    return null
  }
}

rounds.forEach((round, ind) => {
  let id = ind + 1
  let {start} = getRoundTimes(id)
  
  Pointer.GET(AuthLevels.ALL, `/rounds/${id}`, (req, c, pack) => {
    let returned_round: Round | null = getRoundsObj(ind + 1)
    if (returned_round == null) { return new Error("Invalid Round ID!") }
    return returned_round
  }, start)
})