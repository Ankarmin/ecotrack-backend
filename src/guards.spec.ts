import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AdminGuard } from './admin/admin.guard';
import { ClientGuard } from './auth/client.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { UserRoleEnum } from './database/database.enums';

function createMockContext(user?: { userId: string; email: string; role: UserRoleEnum }, authHeader?: string) {
  const request: any = {
    headers: {
      authorization: authHeader,
    },
    user,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: any;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    };

    guard = new JwtAuthGuard(jwtService);
  });

  it('R-06: rechaza peticion sin token Bearer', async () => {
    const context = createMockContext();
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('R-06: rechaza token invalido o expirado', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('expired'));
    const context = createMockContext(undefined, 'Bearer invalid-token');

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('permite peticion con token valido y asigna user al request', async () => {
    const payload = { sub: 'user-1', email: 'user@test.com', role: UserRoleEnum.CLIENTE };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const context = createMockContext(undefined, 'Bearer valid-token');

    const result = await guard.canActivate(context);
    expect(result).toBe(true);

    const request = context.switchToHttp().getRequest();
    expect(request.user).toEqual({
      userId: 'user-1',
      email: 'user@test.com',
      role: UserRoleEnum.CLIENTE,
    });
  });

  it('rechaza esquema no Bearer (Basic auth)', async () => {
    const context = createMockContext(undefined, 'Basic dXNlcjpwYXNz');

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza header authorization sin token', async () => {
    const context = createMockContext(undefined, 'Bearer ');
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  it('R-01: permite acceso al Administrador', () => {
    const context = createMockContext({
      userId: 'admin-1',
      email: 'admin@test.com',
      role: UserRoleEnum.ADMINISTRADOR,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('R-01 / CN-09: rechaza acceso a Cliente', () => {
    const context = createMockContext({
      userId: 'client-1',
      email: 'client@test.com',
      role: UserRoleEnum.CLIENTE,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('R-01: rechaza acceso a Validador', () => {
    const context = createMockContext({
      userId: 'valid-1',
      email: 'valid@test.com',
      role: UserRoleEnum.VALIDADOR,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rechaza acceso sin usuario en request', () => {
    const context = createMockContext();

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

describe('ClientGuard', () => {
  let guard: ClientGuard;

  beforeEach(() => {
    guard = new ClientGuard();
  });

  it('permite acceso al Cliente', () => {
    const context = createMockContext({
      userId: 'client-1',
      email: 'client@test.com',
      role: UserRoleEnum.CLIENTE,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rechaza acceso al Validador', () => {
    const context = createMockContext({
      userId: 'valid-1',
      email: 'valid@test.com',
      role: UserRoleEnum.VALIDADOR,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rechaza acceso al Administrador', () => {
    const context = createMockContext({
      userId: 'admin-1',
      email: 'admin@test.com',
      role: UserRoleEnum.ADMINISTRADOR,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rechaza acceso sin usuario en request', () => {
    const context = createMockContext();

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
