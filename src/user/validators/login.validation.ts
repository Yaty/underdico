import { object, string, ObjectSchema } from 'joi';

export const loginValidationSchema: ObjectSchema = object({
  username: string().alpanum().min(3).max(36).required(),
  password: string().alphanum().min(6).max(36).required(),
});
