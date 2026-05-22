import { UserRoleEnum } from '../database/database.enums';
import { Request } from 'express';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRoleEnum;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRoleEnum;
}

export type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};
