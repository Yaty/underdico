import * as Joi from 'joi';

import {
  loginValidationSchema,
} from './login.validation';

export const registerValidationSchema = loginValidationSchema.keys({
  email: Joi.string().email().required(),
});
