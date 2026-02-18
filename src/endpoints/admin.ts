import { AdminState, Modifier, Submission, User, Vote } from "@beepcomp/core";
import rounds from "../rounds.json"
import { DB } from "../modules/db";
import { AuthLevels, Pointer } from "../modules/hono";
import { getCurrentRound, getRoundsObj } from "./rounds";
import { submissions, users } from '../db/schema';
import { eq, inArray, lt } from "drizzle-orm";
import { calcPoints } from "../modules/points";
import { Global } from "../modules/global";
import { getAllUsers } from "../modules/users";
import { avg, easeInOutCirc, sum, wrap } from "../lib/maths";
import { BatchResponse } from "drizzle-orm/batch";

Pointer.POST(AuthLevels.ADMIN, `/admin/refresh_discord_members`, async (req, c, pack) => {
  const BEEPCOMP: KVNamespace = Global.BEEPCOMP
  BEEPCOMP.delete("discord_members")
  return true
})

Pointer.GET(AuthLevels.ADMIN, `/admin/state`, async (req, c, pack) => {
  const db = DB()

  let return_obj: AdminState = {
    submissions: []
  }

  let submissions = await db.query.submissions.findMany({with: {
    authors: true,
    modifiers: {with: {modifier: true}},
    votes: true
  }})
  return_obj["submissions"] = submissions

  let these_users = await db.query.users.findMany({
    where: eq(users.participant, true)
  })

  Global["participants"] = these_users.map(user => user.id)

  return_obj["submissions"] = return_obj["submissions"].map(sub => {
    let new_sub: any = sub
    new_sub["score"] = calcPoints(sub as any)
    return new_sub
  })

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
  
    let currentRound = getCurrentRound()

    return_obj["currentRound"] = currentRound
  
    console.log(`return_obj["currentRound"]`, return_obj["currentRound"])

  return_obj["submissions"] = await db.query.submissions.findMany({with: {
    authors: true,
    modifiers: {with: {
      modifier: true
    }},
    votes: true
  }, where: eq(submissions.round, (currentRound?.id || -1))})

  return return_obj
})

// api.beepcomp.co/admin/bracket/5?preview
Pointer.POST(AuthLevels.ADMIN, `/admin/bracket/:round`, async (req, c, pack) => {
  let isPreview = (req.query("preview") != undefined)

  // Get and Check Round
  let raw_round = req.param("round")
  if (raw_round == undefined) { return new Error("Round Invalid!") }
  let this_round = Number.parseInt(raw_round)
  if(this_round < 5) { new Error("Not Possible Round.") }
  
  const db = DB(c)

  let returned_users = await getAllUsers()

  Global["participants"] = returned_users.filter(user => (user.participant)).map(user => user.id)

  returned_users = returned_users.filter(user => user.valid)

  const getUser = (id: string) => {
    return returned_users.find(user => user.id == id)
  }

  // Round Information
  let round_id = null

  let currentRound = getCurrentRound()
  let visible_round = (getCurrentRound("end")?.id || -1)
  print("visible_round: ", visible_round)

  // Get all public submissions
  let visible_submissions = await db.query.submissions.findMany({
    // where: lt(submissions.round, (visible_round + 1)),
    with: {authors: true, votes: true, modifiers: {with: {modifier: true}}}
  })

  let visible_votes = ([] as Vote[]).concat(...visible_submissions.map(sub => sub.votes))
  // let used_modifiers = ([] as Modifier[]).concat(...visible_submissions.map(sub => sub.modifiers.map(entry => entry.modifier)))
  let used_modifiers: Modifier[] = []
  let MOD_MAP: {[round: string]: {[key: string]: {ids: string[], count: number}}} = {}
  visible_submissions.forEach(sub => {
    if ((MOD_MAP[sub.round]) == null) { MOD_MAP[sub.round] = {} }
    sub.modifiers.forEach(entry => {
      let key = entry.modifier.text.toUpperCase()
      if (MOD_MAP[sub.round][key] == null) { MOD_MAP[sub.round][key] = {ids: [], count: 0} }
      MOD_MAP[sub.round][key].ids.push(entry.modifier.submitter)
      MOD_MAP[sub.round][key].count += 1
    })
  })
  // print("MOD_MAP: ", JSON.stringify(MOD_MAP, null, 2))

  // print(round_id)
  // print("visible_submissions: ", visible_submissions.map(({title, round}) => {
  //   return {title, round}
  // })) 

  // let bonus_token_telemetry: string[] = []
  // let bonus_stats: {[id: string]: {amount: number, context: string}[]} = {}
  // const bonus_token_account = (idx: number, raw_amount: number, telemetry: string = '') => {
  //   let user: User = returned_users[idx]
  //   let amount = Math.round(raw_amount * 10)
  //   bonus_token_telemetry.push(`[@${user.username}:${user.id}] ${amount >= 0 ? '+' : ''}${amount} | ${telemetry}`)
  //   if (bonus_stats[user.id] == null) { bonus_stats[user.id] = [] }
  //   bonus_stats[user.id].push({amount, context: telemetry})
  //   returned_users[idx]["bonus_tokens"] += amount
  // }


  // Point & Bonus Token calculation...
  print(returned_users.map(user => user.id))
  for (let idx = 0; idx < returned_users.length; idx++) {
    returned_users[idx]["bonus_tokens"] = 0
    
    let user: User = returned_users[idx]
    let this_guys_submissions = visible_submissions.filter(sub => {
      return sub.authors.some(author => author.userId == user.id)
    })

    // print("PHASE #1 ", this_guys_submissions.sort((a, b) => a.round - b.round).splice(0, 4).map(sub => `${sub.title} - ${calcPoints(sub)}`))
    // print("PHASE #2 ", this_guys_submissions.sort((a, b) => a.round - b.round).splice(4, 4).map(sub => `${sub.title} - ${calcPoints(sub)}`))
    
    returned_users[idx]["points"] = sum(this_guys_submissions.sort((a, b) => a.round - b.round).splice(0, 4).map(sub => calcPoints(sub)).sort((a, b) => b - a).splice(0, 3)) + sum(this_guys_submissions.sort((a, b) => a.round - b.round).splice(4, 4).map(sub => calcPoints(sub)))
    returned_users[idx]["total_points"] = sum(this_guys_submissions.map(sub => calcPoints(sub)))
    returned_users[idx]["submission_count"] = this_guys_submissions.length

    print(returned_users[idx].id, returned_users[idx]["points"])

    // for (let sub_idx = 0; sub_idx < this_guys_submissions.length; sub_idx++) {
    //   let this_sub = this_guys_submissions[sub_idx]

    //   if (typeof this_sub.artwork == "string" && this_sub.artwork.length > 0) { bonus_token_account(idx, 10, `Submitted artwork for Round #${this_sub.round}`) }

    //   let challenge_sub = visible_submissions.find(sub => ((sub.submitter == this_sub.challengerId || sub.challengerId == this_sub.submitter) && sub.round == this_sub.round))
    //   if (challenge_sub) {
    //     // returned_users[idx]["bonus_tokens"] += 
    //     let amount = (calcPoints(this_sub) > calcPoints(challenge_sub) ? 15 : -15)
    //     bonus_token_account(idx, amount, (amount > 0 ? `Won a battle` : 'Lost a battle') + ` against @${returned_users.find(user => user.id == challenge_sub.submitter).username} in Round #${this_sub.round}`)
    //   }

    //   // returned_users[idx]["bonus_tokens"] += (this_sub.modifiers.length * 3)
    //   let mod_count = (this_sub.modifiers.length * 3)
    //   let mod_avg = ((avg(visible_votes.filter(vote => vote.submissionId == this_sub.id).map(vote => vote.modifiers)) / 10) || 0)
    //   bonus_token_account(idx, (mod_count * easeInOutCirc(mod_avg)), `Used ${this_sub.modifiers.length} modifier${this_sub.modifiers.length > 0 ? 's' : ''} (${this_sub.modifiers.map(entry => entry.modifier.text).join(", ")}) and scored ${Math.round(mod_avg * 100)}% in Round #${this_sub.round}`)
    //   // returned_users[idx]["bonus_tokens"] += (visible_votes.filter(vote => vote.sendingId).length)
    // }

    // let this_vote_count = (visible_votes.filter(vote => vote.sendingId == user.id).length)
    // bonus_token_account(idx, (this_vote_count * 0.3), `Voted ${this_vote_count} times`)
  }
  
  // Object.keys(MOD_MAP).forEach(round => {
  //   let map = MOD_MAP[round]
  //   let highest: Set<string> = new Set()
  //   let current_high = 0
  //   let highest_key = ""
  //   Object.keys(map).forEach(key => {
  //     let entry = MOD_MAP[round][key]
  //     if (entry.count > current_high) {
  //       highest.clear()
  //       current_high = entry.count
  //     }

  //     if (entry.count == current_high) {
  //       highest_key = key
  //       entry.ids.forEach(id => highest.add(id))
  //     }
  //   })

  //   print(highest)

  //   highest.forEach(id => {
  //     let idx = returned_users.findIndex(user => user.id == id)
  //     bonus_token_account(idx, 10, `Submitted the most used modifier for Round ${round} (${highest_key})`)
  //   })
  // })

  // print("bonus_token_telemetry: ", bonus_token_telemetry)

  

  // return {users: returned_users, bonus_stats}

  const PHASE_2_COUNT = 48
  const BRACKET_COUNTS = [
    16, 8, 4, 1
  ]
  let THIS_BRACKET_COUNT = BRACKET_COUNTS[this_round - 5]
  let PREV_BRACKET_COUNT = (this_round > 5 ? BRACKET_COUNTS[this_round - 6] : PHASE_2_COUNT)
  let BRACKETS = new Array(THIS_BRACKET_COUNT)

  let valid_users = []
  if (this_round == 5) {
    valid_users = returned_users.sort((userA, userB) => {
      return userB.points - userA.points
    }).splice(0, PREV_BRACKET_COUNT)
  } else {
    for (let prev_idx = 0; prev_idx < PREV_BRACKET_COUNT; prev_idx++) {
      let users_this_bracket = returned_users.filter(user => {return user[`round_${this_round - 1}_bracket`] == prev_idx + 1})
      
      users_this_bracket.sort((a, b) => {
        let ASub = visible_submissions.find(sub => sub.authors.some(authorObj => authorObj.userId == a.id) && sub.round == (this_round - 1))
        let BSub = visible_submissions.find(sub => sub.authors.some(authorObj => authorObj.userId == b.id) && sub.round == (this_round - 1))
        let Aval = (ASub != null ? calcPoints(ASub) : 0)
        let Bval = (BSub != null ? calcPoints(BSub) : 0)

        print(`${a.id} (${Aval}) - ${b.id} (${Bval})`)
        
        if (Bval == Aval) {
          return b.points - a.points
        } else {
          return Bval - Aval
        }
      })

      print(users_this_bracket)

      valid_users.push(users_this_bracket[0])

      print(`Bracket #${prev_idx + 1} ${users_this_bracket[0].id}`)
    }
  }

  // print(valid_users)

  valid_users.forEach((user, idx) => {
    // print(`[${idx+1}] `, user.id, " - ", user.points)
    let bracket_idx = wrap(idx, 0, THIS_BRACKET_COUNT)
    if (BRACKETS[bracket_idx] == null) { BRACKETS[bracket_idx] = [] }
    BRACKETS[bracket_idx].push(user.id)
  })

  if (!isPreview) {
    print("Not Preview; Updating!")
    let mini_SETTER: any = {}
    mini_SETTER[`round_${this_round}_bracket`] = 0
    // print(mini_SETTER)
    await db.update(users).set(mini_SETTER)

    let proms = BRACKETS.map((bracket_users, bracket_idx) => {
      let SETTER: any = {}
      SETTER[`round_${this_round}_bracket`] = (bracket_idx + 1)
      // print(SETTER)
      return db.update(users).set(SETTER).where(inArray(users.id, bracket_users))
    })

    for await (const prom of proms) {
      await prom
    }

    // await Promise.all(proms)
  }

  return BRACKETS.map(bracket => {
    return bracket.map((userId: string) => {
      return returned_users.find(user => user.id == userId)
    })
  })
})