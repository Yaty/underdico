import { ExtractJwt } from 'passport-jwt';

export function ExtractJWTFromWs(client: any): string {
  return ExtractJwt.fromAuthHeaderAsBearerToken()(client.handshake) ||
  (client.handshake.query && client.handshake.query.jwt);
}
