import { Config } from './config.interface';

const config: Config = {
  HOST: process.env.HOST,
  PORT: Number(process.env.PORT),
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_ALGORITHM: process.env.JWT_ALGORITHM,
  JWT_EXPIRATION: process.env.JWT_EXPIRATION,
  JWT_ISSUER: process.env.JWT_ISSUER,
  GOOGLE_CLOUD_STORAGE_BUCKET: process.env.GOOGLE_CLOUD_STORAGE_BUCKET,
  GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
  GOOGLE_CLOUD_STORAGE_CLIENT_EMAIL: process.env.GOOGLE_CLOUD_STORAGE_CLIENT_EMAIL,
  GOOGLE_CLOUD_STORAGE_PRIVATE_KEY: process.env.GOOGLE_CLOUD_STORAGE_PRIVATE_KEY,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_DB: process.env.REDIS_DB,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_PREFIX: process.env.REDIS_PREFIX,
};

export default config;
