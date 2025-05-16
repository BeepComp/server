import { Snowflake } from '@sapphire/snowflake';
import { Context, HonoRequest } from "hono"
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { DB } from './db';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { User } from "@beepcomp/core"

const app = new Hono()

app.use('*', async (c, next) => {
  const corsMiddlewareHandler = cors({
    origin: "*",
  })
  return corsMiddlewareHandler(c, next)
})

const snowflake = new Snowflake(SNOWFLAKE_EPOCH);

export interface RequestPack {
  auth_level: AuthLevel;
  user?: User;
  rid: string;
}
type HonoParams = (req: HonoRequest, c: Context, pack: RequestPack) => void
enum AuthLevel {
  NONE,
  DISCORD,
  ADMIN
}
export const AuthLevels = {
  ALL: [AuthLevel.NONE, AuthLevel.DISCORD, AuthLevel.ADMIN],
  DISCORD: [AuthLevel.DISCORD, AuthLevel.ADMIN],
  ONLY_DISCORD: [AuthLevel.DISCORD],
  ONLY_ADMIN: [AuthLevel.ADMIN],
}

function base_enpoint(method: ("get" | "post" | "patch" | "put" | "delete"), auth: AuthLevel[], path: string, func: HonoParams, unlocks: number | null = null) {
  // console.log("Defining...", arguments, app)
  app[method](path, async (c: Context) => {
    let rid = String(snowflake.generate())
    let token = c.req.header("Authorization")?.split(" ")[1]
    let pack: RequestPack = {
      auth_level: AuthLevel.NONE,
      rid
    }
    
    // Check Authentication Level Here :^)
    if (token == c.env.ADMIN_TOKEN) { // so ez
      pack.auth_level = AuthLevel.ADMIN
    } else {
      let res = await fetch("https://discord.com/api/v10/users/@me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      let json: any = await res.json()
      if (json?.code == 0 && json?.message == "401: Unauthorized") {
        // ... erm...
      } else {
        pack.auth_level = AuthLevel.DISCORD
        pack.user = json
      }
    }

    // Attaching DB user data
    if (pack.user) {
      const db = DB(c)

      const user = await db.query.users.findFirst({
        where: eq(users.id, pack.user.id)
      })

      pack.user.participant = (user?.participant || false)
    }

    print(unlocks)
    print(Date.now())

    if (unlocks != null && unlocks > Date.now() && pack.auth_level != AuthLevel.ADMIN) {
      c.status(403)
      return c.json({error: "not available yet... sneaky", unlocks_in: unlocks - Date.now()})
    } else if (auth.includes(pack.auth_level)) {
      let returnVal: any = await func(c.req, c, pack)
      if (returnVal != null && !(returnVal instanceof Error)) {
        return c.json(returnVal)
        // flushEvents(rid) <- does websocket even work with  serverless?... dumb question
      } else if (returnVal instanceof Error) {
        c.status(400)
        return c.json({error: returnVal.message})
        // dropEvents(rid)
      }
    } else {
      c.status(401)
      return c.json({error: "unauthorized"})
    }
  })
}
export const Pointer = {
  GET: (auth_level: AuthLevel[], path: string, func: HonoParams, unlocks: number | null = null) => {return base_enpoint("get", auth_level, path, func, unlocks)},
  POST: (auth_level: AuthLevel[], path: string, func: HonoParams, unlocks: number | null = null) => {return base_enpoint("post", auth_level, path, func, unlocks)},
  PUT: (auth_level: AuthLevel[], path: string, func: HonoParams, unlocks: number | null = null) => {return base_enpoint("put", auth_level, path, func, unlocks)},
  PATCH: (auth_level: AuthLevel[], path: string, func: HonoParams, unlocks: number | null = null) => {return base_enpoint("patch", auth_level, path, func, unlocks)},
  DELETE: (auth_level: AuthLevel[], path: string, func: HonoParams, unlocks: number | null = null) => {return base_enpoint("delete", auth_level, path, func, unlocks)}
}



Pointer.GET(AuthLevels.ALL, "/", (req: HonoRequest, c: Context, rid) => {
  return { api_version: "v1", rid }
})


//// Testing Endpoints :^)

Pointer.GET(AuthLevels.DISCORD, "/discord_endpoint", (req: HonoRequest, c: Context, pack: RequestPack) => {
  return { api_version: "v1 (discord edition)", discord: (pack.auth_level == AuthLevel.DISCORD), admin: (pack.auth_level == AuthLevel.ADMIN), rid: pack.rid}
})

Pointer.GET(AuthLevels.ONLY_DISCORD, "/discord_only_endpoint", (req: HonoRequest, c: Context, pack: RequestPack) => {
  return { api_version: "v1 (discord edition)", discord: (pack.auth_level == AuthLevel.DISCORD), admin: (pack.auth_level == AuthLevel.ADMIN), rid: pack.rid, user: pack.user}
})

Pointer.GET(AuthLevels.ONLY_ADMIN, "/admin_endpoint", (req: HonoRequest, c: Context, pack: RequestPack) => {
  return { api_version: "v1 (admin edition)", admin: (pack.auth_level == AuthLevel.ADMIN), rid: pack.rid}
})

// Testing out locked content
Pointer.GET(AuthLevels.ALL, "/week_from_now", (req: HonoRequest, c: Context, pack: RequestPack) => {
  return { api_version: "v1 (week from now edition)", rid: pack.rid}
}, 1746739687224) // unlocks in a week

export default app