export interface IProcessEnv {
  ADMIN_TOKEN: string;
  DATABASE_HOST: string;

  TOURNAMENT_EPOCH: string;

  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_REDIRECT_URI: string;

  DISCORD_TOKEN: string;
  DISCORD_ANNOUNCEMENT_CHANNEL: string;
  DISCORD_CHAT_CHANNEL: string;
  DISCORD_ROLE: string;

  MAIN_SERVER: string;
  VALID_SERVERS: string;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends IProcessEnv { }
  }
}