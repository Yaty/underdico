import * as jwt from 'jsonwebtoken';

export function ExtractUserIdFromJWT(token: string): string {
  const decoded = jwt.decode(token) as any;
  return decoded.id;
}
