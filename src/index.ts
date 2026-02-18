import "dotenv/config"

// Extends
import "./extends/print"
import "./extends/epoch"

import "./modules/setup"

// Endpoints//
import "./endpoints/state"

import "./endpoints/users"
import "./endpoints/rounds"

import "./endpoints/signup"
import "./endpoints/login"

import "./endpoints/discord"
import "./endpoints/submissions"
import "./endpoints/votes"
import "./endpoints/modifiers"
import "./endpoints/requests"
import "./endpoints/admin"

// ModulesZ
// import "./modules/discord"
import app from "./modules/hono"
import { Env as HonoEnv } from "hono"
import { _cacheDiscordMembers } from "./modules/users"
import { Global } from "./modules/global"

interface Env extends HonoEnv {
  BEEPCOMP: any; // Replace 'any' with the actual type if known
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    Global["BEEPCOMP"] = env.BEEPCOMP
    await _cacheDiscordMembers(true)
    print("Done!")
  },

  async fetch(request: Request, env: Env) {
    return await app.fetch(request, env);
  },
}