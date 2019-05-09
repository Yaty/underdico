import { Config } from './config.interface';

const config: Config = {
  HOST: process.env.HOST,
  PORT: Number(process.env.PORT),
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_ALGORITHM: process.env.JWT_ALGORITHM,
  JWT_EXPIRATION: process.env.JWT_EXPIRATION,
  JWT_ISSUER: process.env.JWT_ISSUER,
};

export default config;
