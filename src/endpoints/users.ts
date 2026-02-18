import { eq, lt } from "drizzle-orm"
import { users, modifiers, submissions } from '../db/schema';
import { DB } from "../modules/db"
import { Pointer, AuthLevels } from "../modules/hono"
// import snowflake from "../modules/snowflake"
import { DiscordBot, GuildBot } from "../modules/discord"
// import { AxiosError } from "axios"
import { Global } from "../modules/global"
import { calcPoints } from "../modules/points"
import rounds from "../rounds.json"
import { avg, easeInOutCirc, sum } from '../lib/maths';
import { Modifier, User, Vote } from "@beepcomp/core";
import { getAllUsers } from "../modules/users";
import { getCurrentRound, getRoundsObj } from "./rounds";

Pointer.GET(AuthLevels.ALL, `/users`, async (req, c, pack) => {
  const db = DB(c)

  let returned_users = await getAllUsers()

  Global["participants"] = returned_users.filter(user => user.participant).map(user => user.id)

  // Round Information
  let round_id = null

  let currentRound = getCurrentRound("start")
  let visible_round = (getCurrentRound("end")?.id || -1)
  print("visible_round: ", visible_round)

  // Get all public submissions
  let visible_submissions = await db.query.submissions.findMany({
    where: lt(submissions.round, (visible_round + 1)),
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

  print(round_id)
  print("visible_submissions: ", visible_submissions.map(({title, round}) => {
    return {title, round}
  })) 

  let bonus_token_telemetry: string[] = []
  let bonus_stats: {[id: string]: {amount: number, context: string}[]} = {}
  const bonus_token_account = (idx: number, raw_amount: number, telemetry: string = '') => {
    let user: User = returned_users[idx]
    let amount = Math.round(raw_amount * 10)
    bonus_token_telemetry.push(`[@${user.username}:${user.id}] ${amount >= 0 ? '+' : ''}${amount} | ${telemetry}`)
    if (bonus_stats[user.id] == null) { bonus_stats[user.id] = [] }
    bonus_stats[user.id].push({amount, context: telemetry})
    returned_users[idx]["bonus_tokens"] += amount
  }


  // Point & Bonus Token calculation...
  print(returned_users.map(user => user.id))
  for (let idx = 0; idx < returned_users.length; idx++) {
    returned_users[idx]["bonus_tokens"] = 0
    
    let user: User = returned_users[idx]
    let this_guys_submissions = visible_submissions.filter(sub => {
      return sub.authors.some(author => author.userId == user.id)
    })

    returned_users[idx]["points"] = sum(this_guys_submissions.map(sub => calcPoints(sub)).sort((a, b) => b - a).splice(0, 3))
    returned_users[idx]["total_points"] = sum(this_guys_submissions.map(sub => calcPoints(sub)))
    returned_users[idx]["submission_count"] = this_guys_submissions.length

    for (let sub_idx = 0; sub_idx < this_guys_submissions.length; sub_idx++) {
      let this_sub = this_guys_submissions[sub_idx]

      if (typeof this_sub.artwork == "string" && this_sub.artwork.length > 0) { bonus_token_account(idx, 10, `Submitted artwork for Round #${this_sub.round}`) }

      let challenge_sub = visible_submissions.find(sub => ((sub.submitter == this_sub.challengerId || sub.challengerId == this_sub.submitter) && sub.round == this_sub.round))
      if (challenge_sub) {
        // returned_users[idx]["bonus_tokens"] += 
        let amount = (calcPoints(this_sub) > calcPoints(challenge_sub) ? 15 : -15)
        bonus_token_account(idx, amount, (amount > 0 ? `Won a battle` : 'Lost a battle') + ` against @${returned_users.find(user => user.id == challenge_sub.submitter).username} in Round #${this_sub.round}`)
      }

      // returned_users[idx]["bonus_tokens"] += (this_sub.modifiers.length * 3)
      let mod_count = (this_sub.modifiers.length * 3)
      let mod_avg = ((avg(visible_votes.filter(vote => vote.submissionId == this_sub.id).map(vote => vote.modifiers)) / 10) || 0)
      bonus_token_account(idx, (mod_count * easeInOutCirc(mod_avg)), `Used ${this_sub.modifiers.length} modifier${this_sub.modifiers.length > 0 ? 's' : ''} (${this_sub.modifiers.map(entry => entry.modifier.text).join(", ")}) and scored ${Math.round(mod_avg * 100)}% in Round #${this_sub.round}`)
      // returned_users[idx]["bonus_tokens"] += (visible_votes.filter(vote => vote.sendingId).length)
    }

    let this_vote_count = (visible_votes.filter(vote => vote.sendingId == user.id).length)
    bonus_token_account(idx, (this_vote_count * 0.3), `Voted ${this_vote_count} times`)
  }
  
  Object.keys(MOD_MAP).forEach(round => {
    let map = MOD_MAP[round]
    let highest: Set<string> = new Set()
    let current_high = 0
    let highest_key = ""
    Object.keys(map).forEach(key => {
      let entry = MOD_MAP[round][key]
      if (entry.count > current_high) {
        highest.clear()
        current_high = entry.count
      }

      if (entry.count == current_high) {
        highest_key = key
        entry.ids.forEach(id => highest.add(id))
      }
    })

    print(highest)

    highest.forEach(id => {
      let idx = returned_users.findIndex(user => user.id == id)
      bonus_token_account(idx, 10, `Submitted the most used modifier for Round ${round} (${highest_key})`)
    })
  })

  print("bonus_token_telemetry: ", bonus_token_telemetry)

  return {users: returned_users, bonus_stats}
})

Pointer.GET(AuthLevels.ONLY_DISCORD, `/users/@me`, async (req, c, pack) => {
  if (pack.user == null) { return new Error("Invalid User!") }
  const db = DB(c)

  const user = await db.query.users.findFirst({
    where: eq(users.id, pack.user.id)
  })

  return user
})

Pointer.DELETE(AuthLevels.ONLY_DISCORD, `/users/@me`, async (req, c, pack) => {
  if (pack.user == null) { return new Error("Invalid User!") }
  const db = DB(c)

  let res = await db.delete(users).where(eq(users.id, pack.user.id))
  print(res)

  let guild_res = await pack.request_guilds()
  if (guild_res.main_server) {
    await DiscordBot.remove_role(pack.user.id)
  }

  return {success: "probably"}
})