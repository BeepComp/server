import { AdminState, Submission } from "@beepcomp/core";
import { DB } from "../modules/db";
import { AuthLevels, Pointer } from "../modules/hono";

Pointer.GET(AuthLevels.ADMIN, `/admin_state`, async (req, c, pack) => {
  const db = DB()

  let return_obj: AdminState = {
    submissions: []
  }

  let submissions = await db.query.submissions.findMany({with: {
    authors: true
  }})
  return_obj["submissions"] = submissions

  return return_obj
})