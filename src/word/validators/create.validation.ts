import * as Joi from 'joi';

export const createValidation: Joi.ObjectSchema = Joi.object().keys({
  name: Joi.string().alphanum().min(1).max(64).required(),
  definition: Joi.string().min(1).max(2048).required(),
  tags: Joi.array().items(Joi.string()).unique(),
});
