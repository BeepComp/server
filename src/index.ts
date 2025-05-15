import "dotenv/config"

// Extends
import "./extends/print"
import "./extends/epoch"

// Endpoints//
import "./endpoints/rounds"
import "./endpoints/signup"
import "./endpoints/state"
import "./endpoints/discord"
// import "./endpoints/submissions"

// ModulesZ
import app from "./modules/hono"

export default app