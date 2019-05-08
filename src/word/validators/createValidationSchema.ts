import { object, string, array, ObjectSchema } from 'joi';

export const createValidationSchema: ObjectSchema = object({
  name: string().alpanum().min(1).max(64).required(),
  definition: string().min(1).max(2048).required(),
  tags: array().items(string()).unique(),
});
