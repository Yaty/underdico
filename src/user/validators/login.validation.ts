import * as Joi from 'joi';

export const loginValidationSchema = Joi.object().keys({
  username: Joi.string().min(3).max(36).required(),
  password: Joi.string().min(6).max(36).required(),
});
