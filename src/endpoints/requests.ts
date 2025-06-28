import { AuthLevels, Pointer } from "../modules/hono";
import { acceptRequest, declineRequest, getIncomingRequests, getOutgoingRequest } from "../modules/requests";
import rounds from "../rounds.json"
import { requests, submissions } from '../db/schema';
import { DB } from "../modules/db";
import { and, eq } from "drizzle-orm";

Pointer.GET(AuthLevels.ONLY_DISCORD, `/requests/:round`, async (req, c, pack) => {
  // Check User
  if (pack.user == undefined) { return new Error("User Invalid!") }

  // Get and Check Round
  let raw_round = req.param("round")
  if (raw_round == undefined) { return new Error("Round Invalid!") }
  let round = Number.parseInt(raw_round)
  
  // Check if Round Started
  let id = 0
  rounds.find((round, ind) => {
    let TOURNAMENT_EPOCH = Number(process.env.TOURNAMENT_EPOCH)
    let start = TOURNAMENT_EPOCH + (604800000 * ind)
    id = ind + 1

    return (Date.now() > start)
  })
  
  if (round > id) { return new Error("Round Not Even Started Yet...") }

  // ...
  let inc_requests = await getIncomingRequests(pack.user.id, round)
  let out_request = await getOutgoingRequest(pack.user.id, round)

  return {incoming: inc_requests, outgoing: out_request}
})

Pointer.POST(AuthLevels.ONLY_DISCORD, `/requests/accept/:id`, async (req, c, pack) => {
  const db = DB()

  // Check User
  if (pack.user == undefined) { return new Error("User Invalid!") }

  // Get Request
  let req_id = req.param("id")
  if (req_id == undefined) { return new Error("Request ID Invalid!") }
  let request = await db.query.requests.findFirst({where: eq(requests.id, req_id)})

  // Request exist?
  if (request?.receivingId == null) { return new Error("Request Invalid!") }
  
  // Your request?
  if (request?.receivingId != pack.user.id) { return new Error("Not Your Request!") }

  let res

  if (request.type == "battle") {
    let your_submission = await db.query.submissions.findFirst({where: and(eq(submissions.submitter, pack.user.id), eq(submissions.round, request.round))})
    if (your_submission == undefined) { return new Error("Need a Submission This Round To Accept This Battle Request!") }
    
    res = await acceptRequest(request, your_submission.id)
  } else {
    res = await acceptRequest(request)
  }

  return res
})

Pointer.POST(AuthLevels.ONLY_DISCORD, `/requests/decline/:id`, async (req, c, pack) => {
  const db = DB()

  // Check User
  if (pack.user == undefined) { return new Error("User Invalid!") }

  // Get Request
  let req_id = req.param("id")
  if (req_id == undefined) { return new Error("Request ID Invalid!") }
  let request = await db.query.requests.findFirst({where: eq(requests.id, req_id)})

  // Request exist?
  if (request?.receivingId == null) { return new Error("Request Invalid!") }
  
  // Your request?
  if (request?.receivingId != pack.user.id) { return new Error("Not Your Request!") }

  let res = await declineRequest(request)

  return res
})