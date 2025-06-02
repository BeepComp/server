import "dotenv/config"

// Extends
import "./extends/print"
import "./extends/epoch"

// Endpoints//
import "./endpoints/state"

import "./endpoints/users"
import "./endpoints/rounds"

import "./endpoints/signup"

import "./endpoints/discord"
// import "./endpoints/submissions"

// ModulesZ
// import "./modules/discord"
import app from "./modules/hono"

export default app