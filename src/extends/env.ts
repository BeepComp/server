export interface IProcessEnv {
  ADMIN_TOKEN: string;
  DATABASE_HOST: string;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends IProcessEnv { }
  }
}