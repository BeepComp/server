import { AuthLevels, Pointer } from "../modules/hono";

Pointer.POST(AuthLevels.ALL, `/discord/identify`, async (req, c, pack) => {
  let {code} = await req.json()

  let formData = new FormData()
  formData.append("client_id", c.env.DISCORD_CLIENT_ID)
  formData.append("client_secret", c.env.DISCORD_CLIENT_SECRET)
  formData.append("grant_type", "authorization_code")
  formData.append("code", code)
  formData.append("redirect_uri", c.env.DISCORD_REDIRECT_URI)

  let res = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    body: formData
  })

  let json = await res.json()
  // print(json)

  return json
})