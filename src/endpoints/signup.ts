import { modifiers, users } from "../db/schema";
import { DB } from "../modules/db";
import { AuthLevels, Pointer } from "../modules/hono";
import snowflake from "../modules/snowflake";
import metadata from "../signupMeta.json"

Pointer.GET(AuthLevels.ALL, `/signup/meta`, (req, c, pack) => {
  return metadata
})

Pointer.POST(AuthLevels.ONLY_DISCORD, `/signup`, async (req, c, pack) => {
  if (pack.user == null) { return new Error("User Object Missing?") }

  let {noun, verb, adjective} = await req.json()
  const db = DB(c)

  // Make User
  let newUser = await db.insert(users).values({id: pack.user.id, participant: true})

  // Make Modifiers
  let promNounModifier = db.insert(modifiers).values({
    id: snowflake(),
    type: "noun",
    text: noun,
    submitter: pack.user.id
  })
  let promVerbModifier = db.insert(modifiers).values({
    id: snowflake(),
    type: "verb",
    text: verb,
    submitter: pack.user.id
  })
  let promAdjectiveModifier = db.insert(modifiers).values({
    id: snowflake(),
    type: "adjective",
    text: adjective,
    submitter: pack.user.id
  })

  let res = await Promise.all([
    promNounModifier,
    promVerbModifier,
    promAdjectiveModifier
  ])

  return [newUser].concat(res)
})