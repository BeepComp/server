import { AdminState, Submission } from "@beepcomp/core";
import rounds from "../rounds.json"
import { DB } from "../modules/db";
import { AuthLevels, Pointer } from "../modules/hono";
import { getRoundsObj } from "./rounds";
import { submissions } from '../db/schema';
import { eq } from "drizzle-orm";

Pointer.GET(AuthLevels.ADMIN, `/admin/state`, async (req, c, pack) => {
  const db = DB()

  let return_obj: AdminState = {
    submissions: []
  }

  let submissions = await db.query.submissions.findMany({with: {
    authors: true,
    modifiers: true
  }})
  return_obj["submissions"] = submissions

  return return_obj
})

Pointer.GET(AuthLevels.ADMIN, `/admin/live`, async (req, c, pack) => {
  const db = DB()

    let return_obj: any = { // AdminLiveState
      submissions: [],
      currentRound: {}
    }

    // Round Information
    let id = null
  
    let currentRound = null
    for (let ind = rounds.length - 1; ind >= 0; ind--) {
      let round = getRoundsObj(ind)
      if (Date.now() > (round?.vote || Infinity)) {
        currentRound = round
        id = ind + 1
        break
      }
    }

    return_obj["currentRound"] = currentRound
  
    console.log(`return_obj["currentRound"]`, return_obj["currentRound"])

  return_obj["submissions"] = await db.query.submissions.findMany({with: {
    authors: true,
    modifiers: true
  }, where: eq(submissions.round, (currentRound?.id || -1))})

  return return_obj
})