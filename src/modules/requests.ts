import { DB } from "./db"
import { and, eq, or } from 'drizzle-orm';
import { requests, submissions, usersToSubmissions } from '../db/schema';
import snowflake from "./snowflake";

export async function _resolveRequest(req: string | typeof requests.$inferSelect) {
  const db = DB()
  let request: typeof requests.$inferSelect | undefined
  if (typeof req == "string") { request = await db.query.requests.findFirst({where: eq(requests.id, req)}) }
  else { request = req }

  return request
}

export async function makeRequest(type: "collab" | "battle", sendingId: string, receivingId: string, submissionId: string, round: number) {
  print("Making Request with: ", arguments)
  const db = DB()

  // Can't sent to self
  if (sendingId == receivingId) { return false }

  // Battle Auto Accept (no auto accept on collabs for version control reasons, lol)
  if (type == "battle") {
    let pre_request = await db.query.requests.findFirst({
      where: and(eq(requests.sendingId, receivingId), eq(requests.receivingId, sendingId), eq(requests.round, round)),
    })
    
    if (pre_request != undefined) {
      return acceptRequest(pre_request, submissionId)
    }
  }

  // Make and return
  return db.insert(requests).values({
    id: snowflake(),
    type,
    sendingId,
    receivingId,
    submissionId,
    round
  })
}

export async function acceptRequest(req: string | typeof requests.$inferSelect, submissionId?: string) {
  const db = DB()
  let request = await _resolveRequest(req)
  if (request == undefined) { return false }

  // let submission = (await db.query.submissions.findFirst({where: eq(submissions.id, request.submissionId)}) as typeof submissions.$inferSelect)

  let did_something = false

  if (request.type == "collab") {
    let proms = [
      db.delete(submissions).where(and(eq(submissions.submitter, request.receivingId), eq(submissions.round, request.round))),
      db.insert(usersToSubmissions).values({ userId: request.receivingId, submissionId: request.submissionId }),
      db.delete(requests).where(eq(requests.id, request.id)),
      db.delete(requests).where(or( // delete all other pending requests for that round for the related parties
        and(eq(requests.round, request.round), eq(requests.sendingId, request.sendingId)),
        and(eq(requests.round, request.round), eq(requests.sendingId, request.receivingId)),
        and(eq(requests.round, request.round), eq(requests.receivingId, request.sendingId)),
        and(eq(requests.round, request.round), eq(requests.receivingId, request.receivingId)),
      ))
    ]

    for await (const prom of proms) { await prom }

    did_something = true
  }

  if (request.type == "battle" && submissionId != undefined) {
    // let submission: typeof submissions.$inferSelect
    // if (typeof sub == "string") { submission = (await db.query.submissions.findFirst({where: eq(submissions.id, sub)}) as typeof submissions.$inferSelect) }
    // else { submission = sub }

    // let other_submission = await db.query.submissions.findFirst({where: eq(submissions.id, (request.submissionId as string))})
    
    let proms = [
      db.update(submissions).set({ challengerId: request.sendingId }).where(eq(submissions.id, submissionId)),
      db.update(submissions).set({ challengerId: request.receivingId }).where(eq(submissions.id, request.submissionId)),
      db.delete(requests).where(eq(requests.id, request.id)),
      db.delete(requests).where(or( // delete all other pending requests for that round for the related parties
        and(eq(requests.round, request.round), eq(requests.sendingId, request.sendingId)),
        and(eq(requests.round, request.round), eq(requests.sendingId, request.receivingId)),
        and(eq(requests.round, request.round), eq(requests.receivingId, request.sendingId)),
        and(eq(requests.round, request.round), eq(requests.receivingId, request.receivingId)),
      ))
    ]

    for await (const prom of proms) { await prom }

    did_something = true
  }

  return did_something
}

export async function declineRequest(req: string | typeof requests.$inferSelect) {
  const db = DB()
  let request = await _resolveRequest(req)
  if (request == undefined) { return false }

  (await db.delete(requests).where(eq(requests.id, request.id)))
  
  return true
}

export async function getIncomingRequests(userId: string, round: number) {
  const db = DB()
  let inc_requests = await db.query.requests.findMany({where: and(
    eq(requests.receivingId, userId),
    eq(requests.round, round)
  )})
  
  return inc_requests
}

export async function getOutgoingRequest(userId: string, round: number) {
  const db = DB()
  let out_request = await db.query.requests.findFirst({where: and(
    eq(requests.sendingId, userId),
    eq(requests.round, round)
  )})
  
  return out_request
}