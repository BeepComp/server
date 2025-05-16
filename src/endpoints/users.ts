import { eq } from "drizzle-orm"
import { users, modifiers } from "../db/schema"
import { DB } from "../modules/db"
import { Pointer, AuthLevels } from "../modules/hono"
import snowflake from "../modules/snowflake"

Pointer.GET(AuthLevels.ONLY_DISCORD, `/users/@me`, async (req, c, pack) => {
  if (pack.user == null) { return new Error("User Object Missing?") }
  const db = DB(c)

  const user = await db.query.users.findFirst({
    where: eq(users.id, pack.user.id)
  })

  return user
})

Pointer.DELETE(AuthLevels.ONLY_DISCORD, `/users/@me`, async (req, c, pack) => {
  if (pack.user == null) { return new Error("User Object Missing?") }
  const db = DB(c)

  let res = await db.delete(users).where(eq(users.id, pack.user.id))
  print(res)

  return {success: "probably"}
})