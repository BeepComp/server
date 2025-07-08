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

import "./endpoints/discord"
import "./endpoints/submissions"
import "./endpoints/votes"
import "./endpoints/modifiers"
import "./endpoints/requests"
import "./endpoints/admin"

// ModulesZ
// import "./modules/discord"
import app from "./modules/hono"

export default app