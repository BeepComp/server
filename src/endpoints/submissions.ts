import { Submission, SubmissionRequest, SubmissionSchema } from "@beepcomp/core";
import { AuthLevels, Pointer } from "../modules/hono";
import rounds from "../rounds.json"
import { modifiersToSubmissions, submissions, users, usersToSubmissions, modifiers, requests } from '../db/schema';
import { DB } from "../modules/db";
import snowflake from "../modules/snowflake";
import { eq } from "drizzle-orm";
import { makeRequest } from "../modules/requests";

Pointer.GET(AuthLevels.ONLY_DISCORD, `/submit/:round`, async (req, c, pack) => {
  if (pack.user == undefined) { return new Error("User Invalid!") }

  let raw_round = req.param("round")
  if (raw_round == undefined) { return new Error("Round Invalid!") }
  let round = Number.parseInt(raw_round)

  const db = DB(c)

  let user = await db.query.users.findFirst({
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
  let query = user?.submissions.find(this_submission => {
    return (this_submission.submission.round == round)
  })

  if (query?.submission != null) {
    let {submission} = query
    let response_submission: Submission = {
      id: submission.id,
      submitter: (submission.submitter as string),
      authors: submission.authors.map(entry => entry.userId),
      challenger: undefined,
      title: (submission.title as string),
      link: (submission.link as string),
      player_link: (submission.player_link as string),
      round_id: round,
      modifiers: submission.modifiers.map(entry => entry.modifierId),
      okay_count: 0, // Empty here
      score: 0 // Empty here
    }
    return response_submission
  } else {
    return new Error("Submission Doesn't Exist!")
  }
})

Pointer.POST(AuthLevels.ONLY_DISCORD, `/submit/:round`, async (req, c, pack) => {
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

  // DB Worker
  const db = DB(c)

  // Get Previous Submission For Round to Replace
  let user = await db.query.users.findFirst({
    where: eq(users.id, pack.user.id),
    with: {
      submissions: {with: {
        submission: true
      }}
    }
  })
  let problem_submission = user?.submissions.find(this_submission => {
    return (this_submission.submission.round == round)
  })
  print("problem_submission: ", problem_submission)
  if (problem_submission != null) { // Deleting to Replace...
    await db.delete(submissions).where(eq(submissions.id, problem_submission.submissionId))
  }

  // Get Submission Data
  let submission: SubmissionRequest = await req.json()
  print("raw_submission: ", submission)
  // let submission: Submission = await req.json()
  
  // Database Submission Data
  let newSubmission = await db.insert(submissions).values({
    id: snowflake(),
    title: submission.title,
    link: submission.link,
    round,
    submitter: pack.user.id
  }).returning({ id: submissions.id })

  // Database Submission Authors
  let userId = pack.user.id
  let submissionId = (newSubmission[0].id)

  let inserts: Promise<any>[] = []
  inserts.push(db.insert(usersToSubmissions).values({
    userId,
    submissionId
  }))

  // Database Submission Modifiers
  submission.modifiers.forEach((modifierId: string) => {
    inserts.push(db.insert(modifiersToSubmissions).values({
      modifierId,
      submissionId
    }))
  })

  // Send Out Requests
  if (submission.request_type != null && submission.request_receivingId != null) {
    inserts.push(makeRequest(
      submission.request_type,
      userId,
      submission.request_receivingId,
      submissionId,
      round
    ))
  }

  await Promise.all(inserts)

  return newSubmission
})