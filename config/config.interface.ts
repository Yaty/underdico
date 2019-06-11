export interface Config {
  HOST: string;
  PORT: number;
  MONGO_URI: string;
  JWT_SECRET: string;
  JWT_ALGORITHM: string;
  JWT_EXPIRATION: string;
  JWT_ISSUER: string;
  GOOGLE_CLOUD_PROJECT_ID: string;
  GOOGLE_CLOUD_STORAGE_CLIENT_EMAIL: string;
  GOOGLE_CLOUD_STORAGE_PRIVATE_KEY: string;
  GOOGLE_CLOUD_STORAGE_BUCKET: string;
  REDIS_HOST: string;
  REDIS_PORT: string;
  REDIS_DB: string;
  REDIS_PASSWORD: string;
  REDIS_PREFIX: string;
}
