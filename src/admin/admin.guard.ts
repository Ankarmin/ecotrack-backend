import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { UserRoleEnum } from '../database/database.enums';
import { RequestWithUser } from '../auth/auth.types';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (request.user?.role !== UserRoleEnum.ADMINISTRADOR) {
      throw new ForbiddenException(
        'Solo el rol administrador puede acceder a este modulo',
      );
    }

    return true;
  }
}
