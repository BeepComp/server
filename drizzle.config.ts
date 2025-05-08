import "./src/extends/env"

import * as dotenv from 'dotenv';
import * as path from 'path';


// Load environment variables from a specific path
dotenv.config({ path: path.resolve(__dirname, '.dev.vars') })

import { defineConfig } from "drizzle-kit";
 
export default defineConfig({
  schema: "./src/db",
  out: "./drizzle",
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env?.DATABASE_HOST,
  }
})