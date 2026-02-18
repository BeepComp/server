import { AuthLevels, Pointer } from "../modules/hono";
import jwt from 'jwt-simple';

Pointer.POST(AuthLevels.ALL, `/login`, async (req, c, pack) => {
  let discord_res = await req.json()

  let res = await fetch("https://discord.com/api/v10/users/@me", {
    headers: {
      Authorization: `Bearer ${discord_res.access_token}`
    }
  })

  let json: any = await res.json()
  print("Discord Result: ", json)
  // print("flags: ", flags)
  if (json.id == null) {
    return new Error("Discord Not Authorized")
  } else {
    let token = jwt.encode({
      access_token: discord_res.access_token,
      id: json.id
    }, c.env.JWT_SECRET)

    return token
  }
})