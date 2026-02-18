import { Snowflake } from '@sapphire/snowflake';
import { Context, HonoRequest } from "hono"
import { Hono } from 'hono'
import { cors } from 'hono/cors'
// import { DB } from './db';
// import { eq } from 'drizzle-orm';
// import { users } from '../db/schema';
import { User } from "@beepcomp/core";
// import { DiscordBot, DiscordWebHook } from './discord';
import { pretext } from './setup';
import { Global } from './global';
import jwt from 'jwt-simple';
import { getAllUsers } from './users';

type Bindings = {
  BEEPCOMP: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()
// https://w4lwz7j7-8787.use.devtunnels.ms/
// app.use('*', async (c, next) => {
//   const corsMiddlewareHandler = cors({
//     origin: ["beepcomp.co", "*"],
//   })
//   return corsMiddlewareHandler(c, next)
// })

app.use(cors({
  origin: "*",
  allowHeaders: ["*", "Authorization"]
}))

const snowflake = new Snowflake(SNOWFLAKE_EPOCH);

export interface RequestPack {
  auth_level: AuthLevel;
  user?: User;
  auth_token?: string;
  rid: string;

  request_guilds: () => Promise<{in_servers: string[], main_server: boolean}>;
}
type HonoParams = (req: HonoRequest, c: Context, pack: RequestPack) => void
export enum AuthLevel {
  NONE,
  DISCORD,
  DISCORD_ADMIN,
  ADMIN,
}
export const AuthLevels = {
  ALL: [AuthLevel.NONE, AuthLevel.DISCORD, AuthLevel.DISCORD_ADMIN, AuthLevel.ADMIN],
  DISCORD: [AuthLevel.DISCORD, AuthLevel.DISCORD_ADMIN, AuthLevel.ADMIN],
  ONLY_DISCORD: [AuthLevel.DISCORD, AuthLevel.DISCORD_ADMIN],
  DISCORD_ADMIN: [AuthLevel.DISCORD_ADMIN],
  ADMIN: [AuthLevel.ADMIN, AuthLevel.DISCORD_ADMIN],
  ONLY_ADMIN: [AuthLevel.ADMIN], // why would you ever need this, lol
}

function base_enpoint(method: ("get" | "post" | "patch" | "put" | "delete"), auth: AuthLevel[], path: string, func: HonoParams, unlocks: number | null = null) {
  // console.log("Defining...", arguments, app)
  app[method](path, async (c: Context) => {
    Global["BEEPCOMP"] = c.env.BEEPCOMP

    let rid = String(snowflake.generate())
    Global["rid"] = rid
    let token = c.req.header("Authorization")?.split(" ")[1]
    let token_json: any = {}
    try {
      if (token) { token_json = jwt.decode((token || ""), c.env.JWT_SECRET) }
    } catch(err) {
      token_json = {} // yeah...
    }
    // let token_json = jwt.decode((token || ""), c.env.JWT_SECRET)
    // let token_json = {}
    print(token, token_json)
    let pack: RequestPack = {
      auth_level: AuthLevel.NONE,
      rid,
      auth_token: token_json.access_token,
      request_guilds: async () => {return {in_servers: [], main_server: false}}
    }
    
    // Check Authentication Level Here :^)
    if (token == c.env.ADMIN_TOKEN) { // so ez
      pack.auth_level = AuthLevel.ADMIN
    } else { // DISCORD AUTHENTICATION
      let users = await getAllUsers()
      let user = users.find(this_user => this_user.id == token_json.id)
      pack.user = user
      let is_admin = process.env.ADMINS.split(",").includes(pack?.user?.id || "")
      pack.auth_level = (is_admin ? AuthLevel.DISCORD_ADMIN : AuthLevel.DISCORD)

      // let json: any = await res.json()
      // print("Discord Result: ", json)
      // print("flags: ", flags)
      // if (json?.code == 0 && json?.message == "401: Unauthorized") {
        // ... erm...
      // } else {
        // pack.user = user

        // let is_admin = process.env.ADMINS.split(",").includes(pack?.user?.id || "")
        // pack.auth_level = (is_admin ? AuthLevel.DISCORD_ADMIN : AuthLevel.DISCORD)
      // }
    }

    // Attaching DB user data
    if (pack.user) {
      // const db = DB(c)

      // print("is it the database?")
      // let user = await db.query.users.findFirst({
      //   where: eq(users.id, pack.user.id)
      // })

      // if (user == null) {
      //   user = (await db.insert(users).values({
      //     id: pack.user.id,
      //     participant: false
      //   }).returning({id: users.id, participant: users.participant}) || [])[0]
      // }

      // pack.user.participant = (user?.participant || false)

      //// SERVER CHECKING
      pack.request_guilds = (async () => {
        let return_obj: {in_servers: string[], main_server: boolean} = {
          in_servers: [],
          main_server: false
        }
        // await (new Promise<void>((res, rej) => setTimeout(() => {res()}, 1000))) // no rate limit pls...
        // print("is it the discord guild fetch?")
        let server_res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
          headers: {
            Authorization: `Bearer ${pack.auth_token}`
          }
        })

        let json: any[] = await server_res.json()
        // print("guild res: ", json)
        
        if (Array.isArray(json)) {
          let VALID_SERVERS = (process.env.VALID_SERVERS?.split(",") || [])
          return_obj["in_servers"] = json.map((guild: any) => guild.id).filter( id => VALID_SERVERS.includes(id))
          return_obj["main_server"] = return_obj["in_servers"].includes(process.env.MAIN_SERVER)
        }

        print("in_servers: ", return_obj.in_servers.join(", "))
        print("main_server: ", return_obj.main_server)

        return return_obj
      })
    }

    print(unlocks)
    print(Date.now())
    // print("REQUEST PACK: ", pack)

    if (unlocks != null && unlocks > Date.now() && pack.auth_level != AuthLevel.ADMIN) {
      c.status(403)
      return c.json({error: "not available yet... sneaky", unlocks_in: unlocks - Date.now()})
    } else if (auth.includes(pack.auth_level)) {
      // Setup Pretext yers....
      await pretext()

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



Pointer.GET(AuthLevels.ALL, "/", (req: HonoRequest, c: Context, pack: RequestPack) => {
  let TOURNAMENT_EPOCH = Number(process.env.TOURNAMENT_EPOCH)
  return { api_version: "v1", rid: pack.rid, epoch: TOURNAMENT_EPOCH, time_until_start: (Date.now() - TOURNAMENT_EPOCH) }
})


//// Testing Endpoints :^)

Pointer.GET(AuthLevels.DISCORD, "/discord_endpoint", (req: HonoRequest, c: Context, pack: RequestPack) => {
  return { api_version: "v1 (discord edition)", discord: (pack.auth_level == AuthLevel.DISCORD), admin: (pack.auth_level == AuthLevel.ADMIN), rid: pack.rid}
})

Pointer.GET(AuthLevels.ONLY_DISCORD, "/discord_only_endpoint", (req: HonoRequest, c: Context, pack: RequestPack) => {
  return { api_version: "v1 (discord edition)", discord: (pack.auth_level == AuthLevel.DISCORD), admin: (pack.auth_level == AuthLevel.ADMIN), rid: pack.rid, user: pack.user}
})

Pointer.GET(AuthLevels.ADMIN, "/admin_endpoint", (req: HonoRequest, c: Context, pack: RequestPack) => {
  return { api_version: "v1 (admin edition)", admin: (pack.auth_level == AuthLevel.ADMIN || pack.auth_level == AuthLevel.DISCORD_ADMIN), rid: pack.rid}
})

// Testing out locked content
Pointer.GET(AuthLevels.ALL, "/week_from_now", (req: HonoRequest, c: Context, pack: RequestPack) => {
  return { api_version: "v1 (week from now edition)", rid: pack.rid}
}, 1746739687224) // unlocks in a week

// Testing out sending Discord Messages
// Pointer.GET(AuthLevels.ALL, "/discord_test", async (req: HonoRequest, c: Context, pack: RequestPack) => {
//   let msg = await DiscordBot.send_message(`Hai guys! :3\n-# someone accessed the API point`, false)
//   print( msg )
//   return { api_version: "v1 (pingas!)", rid: pack.rid, msg }
// })

// Testing out sending Discord Messages (WebHook)
// Pointer.GET(AuthLevels.ALL, "/discord_webhook_test", async (req: HonoRequest, c: Context, pack: RequestPack) => {
//   let msg = await DiscordWebHook.send_message(`Hai guys! :3\n-# someone accessed the API point`)
//   print( msg )
//   return { api_version: "v1 (pingas!)", rid: pack.rid, msg }
// })

export default app