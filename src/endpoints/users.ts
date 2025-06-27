import { eq } from "drizzle-orm"
import { users, modifiers } from "../db/schema"
import { DB } from "../modules/db"
import { Pointer, AuthLevels } from "../modules/hono"
import snowflake from "../modules/snowflake"
import { DiscordBot } from "../modules/discord"

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

  let guild_res = await pack.request_guilds()
  if (guild_res.main_server) {
    await DiscordBot.remove_role(pack.user.id)
  }

  return {success: "probably"}
})