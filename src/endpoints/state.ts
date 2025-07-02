import { Modifier, Request, Round, SignupDialogue, State, StateRound, Submission, User } from "@beepcomp/core"
import { AuthLevel, AuthLevels, Pointer } from "../modules/hono"
import rounds from "../rounds.json"
import metadata from "../signupMeta.json"
import { getRoundsObj } from "./rounds"
import { eq, not, or } from "drizzle-orm"
import { requests, users, modifiers } from '../db/schema';
import { DB } from "../modules/db"
import { getAllUsers } from "./users"

Pointer.GET(AuthLevels.ALL, `/state`, async (req, c, pack) => {
  const db = DB()
  // Check User
  // if (pack.user == null) { return new Error("Invalid User!") }

  // Round Information
  let id = null

  let currentRound = null
  for (let ind = rounds.length - 1; ind >= 0; ind--) {
    let round = rounds[ind]
    let TOURNAMENT_EPOCH = Number(process.env.TOURNAMENT_EPOCH)
    let start = TOURNAMENT_EPOCH + (604800000 * ind)
    if (Date.now() > start) {
      currentRound = round
      id = ind + 1
      break
    }
  }

  console.log(currentRound)

  let return_obj: State = {
    serverTime: Date.now(),
    started: (currentRound != null),
    currentRound: (id || undefined),
    server_valid: false,
    modifiers: [],
    admin: false
  }

  // User Participant Stuff
  if (!return_obj.started) { return_obj["signupMeta"] = (metadata as unknown as SignupDialogue[]) }
  if (pack.user) {
    return_obj["user"] = pack.user
    return_obj["admin"] = process.env.ADMINS.split(",").includes(pack.user.id)
  }

  // In Valid Servers for Participation?
  let {in_servers} = await pack.request_guilds()
  return_obj["server_valid"] = (in_servers.length > 0)

  // Post Tournament Start Info
  if (id != null) {
    let proms: Promise<any>[] = [
      getAllUsers(),
      db.query.modifiers.findMany(),
    ]

    if (pack.user) {
      
      let prom2 = db.query.users.findFirst({
        where: eq(users.id, pack.user.id),
        with: {
          submissions: {with: {
            submission: {
              with: {
                authors: true,
                modifiers: true
              }
            },
          }}
        }
      })
      proms.push(prom2)
      proms.push(db.query.requests.findMany({
        where: or(
            eq(requests.receivingId, pack.user.id),
            eq(requests.sendingId, pack.user.id)
          )
        })
      )
    }

    let proms_res = await Promise.all(proms)
    // print("proms_res[2]: ", JSON.stringify(proms_res[2], null, 2))

    let these_modifiers =  (proms_res[1] as (typeof modifiers.$inferSelect)[])

    return_obj["modifiers"] = (these_modifiers.map(modifier => {
      let new_modifier: any = modifier
      if (pack.auth_level < AuthLevel.DISCORD_ADMIN ) { delete new_modifier["submitter"] } 
      return new_modifier
    }) as Modifier[])
    return_obj["other_users"] = (proms_res[0].filter((user: User) => user.id != pack?.user?.id) as User[])

    let state_rounds = rounds.slice(0,id).map((raw_round, ind) => {
      let round = (getRoundsObj(ind + 1) as Round)
      let state_round: StateRound = {
        ...round,
        submission: ((proms_res[2]?.submissions || []).map((entry: any) => entry.submission).filter((submission: any) => submission.round == round.id)[0] || null),
        requests: {
          incoming: (proms_res[3]?.filter((request: Request) => (request.receivingId == pack?.user?.id && request.round == round.id)) || []),
          outgoing: (proms_res[3]?.filter((request: Request) => request.sendingId == pack?.user?.id && request.round == round.id)[0] || null)
        }
      }
      return state_round
    })
    return_obj["rounds"] = state_rounds
  }
  
  return return_obj
})