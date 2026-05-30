import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { RequestWithUser } from './auth.types';
import { roleHasWallet } from './user-role.utils';

@Injectable()
export class ClientGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user || !roleHasWallet(request.user.role)) {
      throw new ForbiddenException(
        'Solo los clientes pueden acceder a la billetera',
      );
    }

    return true;
  }
}
