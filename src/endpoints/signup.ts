import { AuthLevels, Pointer } from "../modules/hono";
import metadata from "../signupMeta.json"

Pointer.GET(AuthLevels.ALL, `/signup/meta`, (req, c, pack) => {
  return metadata
})