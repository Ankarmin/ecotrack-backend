import { Request } from 'express';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};
