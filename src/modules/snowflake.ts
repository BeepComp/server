import { Snowflake } from '@sapphire/snowflake';
const snowflake_gen = new Snowflake(new Date("2025-06-02T06:00:00+01:00"))

export default function snowflake() { return String(snowflake_gen.generate()) }