import { drizzle } from "drizzle-orm/postgres-js";
import { Context } from "hono";
import postgres from "postgres";
import * as schema from "../db/schema"

export const DB = (c?: Context) => {
  const client = postgres(process.env.DATABASE_HOST, { prepare: false })
  const db = drizzle(client, {schema});
  return db
}