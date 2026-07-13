import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('hashea una contrasena y devuelve salt:hash', async () => {
    const hash = await service.hashPassword('password123');

    expect(hash).toContain(':');
    const [salt, key] = hash.split(':');
    expect(salt).toHaveLength(32);
    expect(key).toHaveLength(128);
  });

  it('verifica correctamente una contrasena valida', async () => {
    const hash = await service.hashPassword('password123');
    const isValid = await service.verifyPassword('password123', hash);

    expect(isValid).toBe(true);
  });

  it('rechaza una contrasena incorrecta', async () => {
    const hash = await service.hashPassword('password123');
    const isValid = await service.verifyPassword('wrongpassword', hash);

    expect(isValid).toBe(false);
  });

  it('devuelve false si el hash no tiene formato salt:hash', async () => {
    const isValid = await service.verifyPassword('password123', 'invalido');

    expect(isValid).toBe(false);
  });
});
