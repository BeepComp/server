export interface IProcessEnv {
  ADMIN_TOKEN: string;
  ADMINS: string;
  DATABASE_HOST: string;

  TOURNAMENT_EPOCH: string;

  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_REDIRECT_URI: string;

  DISCORD_TOKEN: string;
  BOT_1_SERVERS: string;
  DISCORD_TOKEN_2: string;
  BOT_2_SERVERS: string;
  DISCORD_ANNOUNCEMENT_CHANNEL: string;
  DISCORD_CHAT_CHANNEL: string;
  DISCORD_ROLE: string;

  MAIN_SERVER: string;
  VALID_SERVERS: string;
  COOL_CHAT_WEBHOOK: string;
  COOL_ANNOUNCEMENT_WEBHOOK: string;
  
  // BEEPCOMP: KVNamespace;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends IProcessEnv { }
  }
}