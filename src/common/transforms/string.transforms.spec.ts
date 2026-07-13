import { trimString, normalizeEmail } from './string.transforms';

describe('string.transforms', () => {
  describe('trimString', () => {
    it('elimina espacios al inicio y final', () => {
      expect(trimString({ value: '  hola  ' })).toBe('hola');
    });

    it('retorna el valor sin cambios si no es string', () => {
      expect(trimString({ value: 123 })).toBe(123);
      expect(trimString({ value: null })).toBe(null);
      expect(trimString({ value: undefined })).toBe(undefined);
    });

    it('retorna string vacio si solo tiene espacios', () => {
      expect(trimString({ value: '   ' })).toBe('');
    });
  });

  describe('normalizeEmail', () => {
    it('convierte a minusculas y elimina espacios', () => {
      expect(normalizeEmail({ value: '  User@Example.COM  ' })).toBe('user@example.com');
    });

    it('retorna el valor sin cambios si no es string', () => {
      expect(normalizeEmail({ value: 123 })).toBe(123);
      expect(normalizeEmail({ value: null })).toBe(null);
    });
  });
});
