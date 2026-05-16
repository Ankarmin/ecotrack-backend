import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

@Injectable()
export class PasswordService {
  async hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;

    return `${salt}:${derivedKey.toString('hex')}`;
  }

  async verifyPassword(password: string, storedPasswordHash: string) {
    const [salt, storedHash] = storedPasswordHash.split(':');

    if (!salt || !storedHash) {
      return false;
    }

    const storedHashBuffer = Buffer.from(storedHash, 'hex');
    const derivedKey = (await scryptAsync(
      password,
      salt,
      storedHashBuffer.length,
    )) as Buffer;

    if (derivedKey.length !== storedHashBuffer.length) {
      return false;
    }

    return timingSafeEqual(derivedKey, storedHashBuffer);
  }
}
