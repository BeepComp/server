import { Round, SongURL, Submission, SubmissionDatabased, SubmissionRequest, SubmissionSchema } from "@beepcomp/core";
import { AuthLevel, AuthLevels, Pointer } from "../modules/hono";
import rounds from "../rounds.json"
import { modifiersToSubmissions, submissions, users, usersToSubmissions, modifiers, requests, votes } from '../db/schema';
import { DB } from "../modules/db";
import snowflake from "../modules/snowflake";
import { and, asc, eq } from "drizzle-orm";
import { makeRequest } from "../modules/requests";
import { getRoundsObj } from "./rounds";
import { DiscordBot2 } from "../modules/discord";

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
      desc: (submission.desc as string),
      round: round,
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
  // Is Participant
  if (!pack.user.participant) { return new Error("User Not A Participant!") } // <- I can't believe you never checked that

  // Get and Check Round
  let raw_round = req.param("round")
  if (raw_round == undefined) { return new Error("Round Invalid!") }
  let round = Number.parseInt(raw_round)

  // Check if Round Started
  let id = 0
  for (let ind = rounds.length - 1; ind >= 0; ind--) {
    let TOURNAMENT_EPOCH = Number(process.env.TOURNAMENT_EPOCH)
    let start = TOURNAMENT_EPOCH + (604800000 * ind)
    if (Date.now() > start) {
      id = ind + 1
      break
    }
  }
  
  if (round > id) { return new Error("Round Not Even Started Yet...") }

  // Check if Round is Still in Open Phase!
  let current_round = getRoundsObj(round)
  if (current_round == undefined) { return new Error("Round Invalid!") }
  if (Date.now() > current_round.vote) { return new Error("Round No Longer Accepting Submissions!") }

  // DB Worker
  const db = DB(c)

  // new ID define
  let newID: string = ""

  // Get Previous Submission For Round to Replace OR update
  let updating = false
  let keeping = false
  let user = await db.query.users.findFirst({
    where: eq(users.id, pack.user.id),
    with: {
      submissions: {with: {
        submission: {
          with: {
            authors: true,
            modifiers: true
          }
        }
      }}
    }
  })
  let problem_submission = user?.submissions.find(this_submission => {
    return (this_submission.submission.round == round)
  })
  print("problem_submission: ", problem_submission)
  if (problem_submission != null) { // Deleting to Replace...
    if (problem_submission.submission.authors.length > 1) { // UPDATE
      newID = problem_submission.submissionId
      updating = true
    } else if (problem_submission.submission.challengerId != null) { // UPDATE
      newID = problem_submission.submissionId
      keeping = true
    } else {
      await db.delete(submissions).where(eq(submissions.id, problem_submission.submissionId))
    }
  }
  print("updating or keeping?", updating, keeping)
  let thistest = !(updating || keeping)

  if (!thistest && problem_submission != null) {
    await db.delete(modifiersToSubmissions).where(eq(modifiersToSubmissions.submissionId, problem_submission.submissionId))
    // let clearModifierRelationsProms: Promise<any>[] = []
    // problem_submission.submission.modifiers.forEach(entry => {
    //   clearModifierRelationsProms.push()
    // })

    // await Promise.all(clearModifierRelationsProms)
  }

  // Get Submission Data
  let submission: SubmissionRequest = await req.json()
  print("raw_submission: ", submission)
  // let submission: Submission = await req.json()
  
  // Link Valid?
  if (SongURL(submission.link) == null) { return new Error("Submission Link Invalid! (Possibly Disallowed Mod/URL Origin)") }

  // Database Submission Data
  print("thistest", thistest)
  if (thistest) {
    newID = (await db.insert(submissions).values({
      id: snowflake(),
      title: submission.title,
      link: submission.link,
      desc: submission.desc,
      round,
      submitter: pack.user.id
    }).returning({ id: submissions.id }))[0].id
  } else {
    let thisSubmissionObj: any = {...submission}
    if (keeping) {
      thisSubmissionObj["challengerId"] = (keeping ? problem_submission?.submission?.challengerId : null)
    }
    await db.update(submissions).set(thisSubmissionObj).where(eq(submissions.id, newID))
  }

  // Database Submission Authors
  let userId = pack.user.id
  let submissionId = (newID)

  let inserts: Promise<any>[] = []
  if (thistest) {
    inserts.push(db.insert(usersToSubmissions).values({
      userId,
      submissionId
    }))
  }

  // Database Submission Modifiers
  // submission.modifiers.forEach((modifierId: string) => {
  //   inserts.push(db.insert(modifiersToSubmissions).values({
  //     modifierId,
  //     submissionId
  //   }))
  // })
  let modifierValues = submission.modifiers.map(
    (modifierId: string) => ({ modifierId, submissionId })
  )
  print("modifierValues", modifierValues)
  inserts.push( db.insert(modifiersToSubmissions).values(modifierValues) )
  inserts.push(DiscordBot2.send_message_outer(`<@${pack.user.id}> - ${JSON.stringify(modifierValues)}`, "1390854178523320410"))

  // Send Out Requests
  if (!updating && !keeping && submission.request_type != null && submission.request_receivingId != null) {
    inserts.push(makeRequest(
      submission.request_type,
      userId,
      submission.request_receivingId,
      submissionId,
      round
    ))
  }

  await Promise.all(inserts)

  return {id: newID}
})