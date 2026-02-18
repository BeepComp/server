import { Round, SongURL, Submission, SubmissionDatabased, SubmissionRequest, SubmissionSchema, Vote } from "@beepcomp/core";
import { AuthLevel, AuthLevels, Pointer } from "../modules/hono";
import rounds from "../rounds.json"
import { modifiersToSubmissions, submissions, users, usersToSubmissions, modifiers, requests, votes } from '../db/schema';
import { DB } from "../modules/db";
import snowflake from "../modules/snowflake";
import { and, asc, eq } from "drizzle-orm";
import { makeRequest } from "../modules/requests";
import { getCurrentRound, getRoundsObj } from "./rounds";
import { DiscordBot2 } from "../modules/discord";
import { obscureSubmission } from "../modules/obscure";
import { calcPoints } from "../modules/points";
import { Global } from "../modules/global";
import { getUser } from "../modules/users";

Pointer.GET(AuthLevels.ALL, "/rounds/:round/submissions", async (req, c, pack) => {
  // Get and Check Round
  let raw_round = req.param("round")
  if (raw_round == undefined) { return new Error("Round Invalid!") }
  let round = Number.parseInt(raw_round)
  let round_obj = getRoundsObj(round)
  if (round_obj == undefined) { return new Error("Round Invalid!") }

  // DB Worker
  const db = DB(c)
  
  let these_submissions = await db.query.submissions.findMany({
    where: eq(submissions.round, round),
    with: { modifiers: true, votes: true, authors: true }
  })

  let these_users = await db.query.users.findMany({
    where: eq(users.participant, true)
  })

  Global["participants"] = these_users.map(user => user.id)

  let cleaned_submissions: any

  cleaned_submissions = these_submissions.map(sub => {
    let new_sub: any = sub
    new_sub["score"] = calcPoints(sub as any)
    return new_sub
  })

  print(Date.now())
  print(round_obj.end)
  let obfuscate = (Date.now() < round_obj.end && pack.auth_level < AuthLevel.DISCORD_ADMIN)
  if (obfuscate) {
    cleaned_submissions = cleaned_submissions.map(obscureSubmission)
  }

  // print(these_submissions)

  return cleaned_submissions
})

Pointer.GET(AuthLevels.ONLY_DISCORD, `/rounds/:round/submit`, async (req, c, pack) => {
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


Pointer.POST(AuthLevels.ONLY_DISCORD, `/rounds/:round/submit`, async (req, c, pack) => {
  // Check User
  if (pack.user == undefined) { return new Error("User Invalid!") }
  // Is Participant
  if (!pack.user.participant) { return new Error("User Not A Participant!") } // <- I can't believe you never checked that

  // Get and Check Round
  let raw_round = req.param("round")
  if (raw_round == undefined) { return new Error("Round Invalid!") }
  let round = Number.parseInt(raw_round)

  // Check if Round Started
  let current_round = getCurrentRound()
  if (current_round == null) { return new Error("Is The Tournament Even Happening??...") }
  
  if (round > current_round.id) { return new Error("Round Not Even Started Yet...") }

  // Check if Round is Still in Open Phase!
  let this_round = getRoundsObj(round)
  if (this_round == undefined) { return new Error("Round Invalid!") }
  if (Date.now() > this_round.vote) { return new Error("Round No Longer Accepting Submissions!") }

  // Eliminated??
  let typed_round: 5 | 6 | 7 | 8 = (round as 5 | 6 | 7 | 8)
  let bracket_key: ("round_5_bracket" | "round_6_bracket" | "round_7_bracket" | "round_8_bracket") = `round_${typed_round}_bracket`;
  if (round >= 5) { // isPhase2
    print("bracket_key: ", bracket_key)
    print("pack.user[bracket_key]: ", pack.user[bracket_key])
    if (pack.user[bracket_key] == 0) {
      return new Error("You're Eliminatedd, Wrap it Uuuuppppp")
    }
  }

  // DB Worker
  const db = DB(c)

  // new ID define
  let newID: string = ""

  // Get Previous Submission For Round to Replace OR update
  let updating = false
  let keepId = null
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

  let inserts: Promise<any>[] = []
  
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
      let keepId = problem_submission.submission.challengerId
      keeping = true
    } else {
      print("Deleting Problem Submission(s)...")
      inserts.push(db.delete(submissions).where(and(eq(submissions.submitter, pack.user.id), eq(submissions.round, round))))
    }
  } else {
    print("Deleting AMY POSSIBLE Problem Submission(s)...")
    inserts.push(db.delete(submissions).where(and(eq(submissions.submitter, pack.user.id), eq(submissions.round, round))))
  }

  print("updating or keeping?", updating, keeping)
  let thistest = !(updating || keeping)

  if (!thistest && problem_submission != null) {
    inserts.push(db.delete(modifiersToSubmissions).where(eq(modifiersToSubmissions.submissionId, problem_submission.submissionId)))
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
    newID = snowflake()
    inserts.push(db.insert(submissions).values({
      id: newID,
      title: submission.title,
      link: submission.link,
      desc: submission.desc,
      artwork: submission.artwork,
      audio: submission.audio,
      round,
      submitter: pack.user.id
    }))
  } else {
    let thisSubmissionObj: any = {...submission}

    if (keeping) {
      thisSubmissionObj["challengerId"] = (keeping ? keepId : null)
    }
    inserts.push(db.update(submissions).set(thisSubmissionObj).where(eq(submissions.id, newID)))
  }
  
  // Database Submission Authors
  let userId = pack.user.id
  let submissionId = (newID)

  if (thistest) {
    print("userId, submissionId: ", userId, submissionId)
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
  if (modifierValues.length > 0) { inserts.push( db.insert(modifiersToSubmissions).values(modifierValues) ) } 
  inserts.push(DiscordBot2.send_message_outer(`<@${pack.user.id}> - ${JSON.stringify(modifierValues)}`, "1390854178523320410"))

  // Send Out Requests
  if ((submission as any).request_type == "") { submission.request_type = null }
  if ((submission as any).request_receivingId == "") { submission.request_type = null }
  function sendRequest() {
    if (!updating && !keeping && submission.request_type != null && submission.request_receivingId != null) {
      inserts.push(makeRequest(
        submission.request_type,
        userId,
        submission.request_receivingId,
        submissionId,
        round
      ))
    }
  }
  if (submission.request_type == "collab" && round >= 5) {
    let receivingUser = await getUser(submission.request_receivingId || "")
    if (receivingUser == null) {
      return new Error("Invalid Collab User!")
    } else if (receivingUser[bracket_key] == 0) {
      return new Error("Collab User is Eliminated!!")
    } else if (receivingUser[bracket_key] == pack.user[bracket_key]) {
      return new Error("Can't Collab Within The Same Bracket!!")
    } else {
      sendRequest()
    }
  } else {
    sendRequest()
  }

  // print(inserts)
  for await (const prom of inserts) { // hmm....
    await prom
  }
  // await Promise.all(inserts)

  return {id: newID}
})