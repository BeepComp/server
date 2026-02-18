import { DB } from "../modules/db"
import { AuthLevels, Pointer } from "../modules/hono"
import { submissions, votes } from '../db/schema';
import snowflake from "../modules/snowflake";
import { and, eq } from "drizzle-orm";

type vote_value_key = "composition" | "production" | "structure" | "style" | "prompt" | "modifiers"

Pointer.POST(AuthLevels.ONLY_DISCORD, `/votes/:submission`, async (req, c, pack) => {
  // Check User
  if (pack.user == undefined) { return new Error("User Invalid!") }
  
  const db = DB(c)

  // Check Submission ID
  let submissionId = req.param("submission")
  if (submissionId == undefined) { return new Error("Submission Invalid!") }
  let submission = await db.query.submissions.findFirst({where: eq(submissions.id, submissionId), with: {authors: true}})
  if (submission == null) { return new Error("Submission Invalid!") }

  // Authors can't vote on their own submission??
  if (submission.authors.findIndex(entry => entry.userId == pack.user?.id) != -1) { new Error("Can't vote on own submission!!") }

  // Delete Duplicate Votes
  await db.delete(votes).where(and(
    eq(votes.submissionId, submissionId),
    eq(votes.sendingId, pack.user.id)
  ))

  let vote_values: {
    composition: number;
    production: number;
    structure: number;
    style: number;
    prompt: number;
    modifiers: number;
  } = await req.json()

  let illegal_vals: string[] = []
  Object.keys(vote_values).forEach((key: string) => {
    let val = vote_values[key as vote_value_key]
    if (key != "modifiers") {
      if (val <= 0 || val > 10) {
        illegal_vals.push(key)
      }
    }
  })

  if (illegal_vals.length > 0) { return new Error(`Illegal Values (${illegal_vals.join(", ")})`) }

  await db.insert(votes).values({
    id: snowflake(),
    sendingId: pack.user.id,
    submissionId,
    ...vote_values
  })

  return true
})