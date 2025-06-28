import { DB } from "../modules/db"
import { AuthLevels, Pointer } from "../modules/hono"

Pointer.GET(AuthLevels.ALL, `/modifiers`, async (req, c, pack) => {
  const db = DB()
  let modifiers = await db.query.modifiers.findMany()

  return modifiers
})