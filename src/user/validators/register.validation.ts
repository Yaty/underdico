import { ObjectSchema, string } from 'joi';

import {
  loginValidationSchema,
} from './login.validation';

export const registerValidationSchema: ObjectSchema = loginValidationSchema.keys({
  email: string().email().required(),
});
