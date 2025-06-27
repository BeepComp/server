import { Interfacer } from "@beepcomp/core"
import { DB } from "./db"

export async function pretext() {
  const db = DB()
  const modifiers = await db.query.modifiers.findMany()
  Interfacer["resolveModifiers"] = () => modifiers.map(modifier => {return {id: modifier.id, text: (modifier.text as string)}})
}