export interface Config {
  HOST: string;
  PORT: number;
  MONGO_URI: string;
  JWT_SECRET: string;
  JWT_ALGORITHM: string;
  JWT_EXPIRATION: string;
  JWT_ISSUER: string;
}
