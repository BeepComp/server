import { Modifier, Request, Round, SignupDialogue, State, StateRound, Submission, SubmissionDatabased, User } from "@beepcomp/core"
import { AuthLevel, AuthLevels, Pointer } from "../modules/hono"
import rounds from "../rounds.json"
import metadata from "../signupMeta.json"
import { getCurrentRound, getRoundsObj } from "./rounds"
import { eq, not, or } from "drizzle-orm"
import { requests, users, modifiers, votes, submissions } from '../db/schema';
import { DB } from "../modules/db"
import { getAllUsers } from "../modules/users"

Pointer.GET(AuthLevels.ALL, `/state`, async (req, c, pack) => {
  const db = DB()
  // Check User
  // if (pack.user == null) { return new Error("Invalid User!") }

  // Round Information
  let currentRound = getCurrentRound()
  let id = currentRound?.id

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
  // let {in_servers} = await pack.request_guilds()
  return_obj["server_valid"] = true

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

    let proms_res: any[] = []
    for await (const prom of proms) { let prom_res = await prom; proms_res.push(prom_res) }
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


Pointer.GET(AuthLevels.ALL, `/vote_state/:round`, async (req, c, pack) => {
  let raw_round = req.param("round")
  if (raw_round == undefined) { return new Error("Round Invalid!") }
  let round = Number.parseInt(raw_round)
  let round_obj = (getRoundsObj(round) as Round)
  
  const db = DB(c)

  let queriedId = req.query('submisisonId')
  let ownSubmission = false
  let pocketSubmission: any = null
  
  let my_votes = await db.query.votes.findMany({
    where: eq(votes.sendingId, (pack.user?.id || "")),
    with: {
      submission: true
    }
  })
  my_votes.map((entry: any) => {
    delete entry.submission["submitter"]
    return entry
  })
  
  let round_submissions = await db.query.submissions.findMany({
    with: {votes: true, authors: true, modifiers: {with: {modifier: true}}}, where: eq(submissions.round, round)
  })

  // print(total_round_submission_count)

  my_votes = my_votes.filter(vote => {
    let test_1 = round_submissions.findIndex(sub => sub.id == vote.submissionId) != -1
    return test_1
  })

  round_submissions = round_submissions.filter(sub => {
    let notAuthor = (sub.authors.findIndex(author => author.userId == pack.user?.id) == -1)
    
    print(sub.id)
    print(queriedId)

    if ((!notAuthor) && sub.id == queriedId) {
      ownSubmission = true
      pocketSubmission = sub
    }

    return notAuthor
  })
  let total_round_submission_count = round_submissions.length

  let current_rating = {
      composition: 0,
      production: 0,
      structure: 0,
      style: 0,
      prompt: 0,
      modifiers: 0,
    }

  let submission: SubmissionDatabased | null = null
  if (queriedId != null) {
    submission = (round_submissions.find(sub => sub.id == queriedId) as SubmissionDatabased)
    if (submission != null) {
      let current_vote = (my_votes.find((vote: any) => vote.submissionId == queriedId) as typeof current_rating)
      current_rating = {
        composition: (current_vote?.composition || 0),
        production: (current_vote?.production || 0),
        structure: (current_vote?.structure || 0),
        style: (current_vote?.style || 0),
        prompt: (current_vote?.prompt || 0),
        modifiers: (current_vote?.modifiers || 0)
      }
    }

    print("current_rating", current_rating)
    print("submission", submission)
  } else {
    print("before", round_submissions.map(sub => sub.id))

    round_submissions = round_submissions.filter(sub => {
      let test_3 = my_votes.findIndex((vote: any) => vote.submissionId == sub.id) == -1;
      return test_3
    })
    print("filter 1", round_submissions.map(sub => sub.id))

    round_submissions = round_submissions.sort((subA, subB) => {
      return subA.votes.length - subB.votes.length
    })
    print("sort", round_submissions.map(sub => sub.id))

    function randi(min: number, max: number) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    round_submissions = round_submissions.filter(sub => {
      let test_1 = sub.votes.length == round_submissions[0].votes.length;
      // let passed = test_1
      // print(sub, passed)
      return test_1;
    })
    print("filter 2", round_submissions.map(sub => sub.id))

    print("after", round_submissions.map(sub => sub.id))

    if (round_submissions.length == 0) { submission = null }
    else {
      submission = (round_submissions[randi(0, round_submissions.length-1)] as SubmissionDatabased)
    }
  }

  // let obfuscate = (Date.now() < round_obj.end && pack.auth_level < AuthLevel.DISCORD_ADMIN)
  let obfuscate = (Date.now() < round_obj.end)
  if (obfuscate && submission != null) {
    delete submission["submitter"]
    delete submission["authors"]

    submission.modifiers = submission.modifiers?.map((entry: any) => {
      if (obfuscate && entry.modifier) { delete entry.modifier["submitter"] }
      return entry
    })
  }
  
  return {
    submission: ((!ownSubmission) ? submission : pocketSubmission), 
    ownSubmission,
    progress: {
      done: my_votes.length,
      total: total_round_submission_count,
    },
    current_rating,
    previous_votes: my_votes
  }
})