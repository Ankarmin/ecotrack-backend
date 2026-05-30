import { UserRoleEnum } from '../database/database.enums';

export function isClientRole(role: UserRoleEnum) {
  return role === UserRoleEnum.CLIENTE;
}

export function roleHasWallet(role: UserRoleEnum) {
  return isClientRole(role);
}
