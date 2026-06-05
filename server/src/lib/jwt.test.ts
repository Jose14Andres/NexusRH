import jwt from 'jsonwebtoken';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  JwtPayload,
} from './jwt';

describe('jwt tests', () => {
import { requireEnv } from './jwt';

describe('requireEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('signAccessToken', () => {
    it('should sign an access token successfully', () => {
      process.env.JWT_SECRET = 'test-access-secret';
      process.env.JWT_EXPIRES_IN = '1h';

      const payload: JwtPayload = {
        sub: 'user-123',
        username: 'testuser',
        roles: ['ADMIN'],
        permisos: ['READ_ALL'],
      };

      const token = signAccessToken(payload);
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, 'test-access-secret') as any;
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.username).toBe(payload.username);
      expect(decoded.roles).toEqual(payload.roles);
      expect(decoded.permisos).toEqual(payload.permisos);
    });

    it('should throw an error if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;

      const payload: JwtPayload = {
        sub: 'user-123',
        username: 'testuser',
        roles: ['ADMIN'],
        permisos: ['READ_ALL'],
      };

      expect(() => signAccessToken(payload)).toThrow('Variable de entorno requerida: JWT_SECRET');
    });
  });

  describe('signRefreshToken', () => {
    it('should sign a refresh token successfully', () => {
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
      process.env.JWT_REFRESH_EXPIRES_IN = '7d';

      const token = signRefreshToken('user-123');
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, 'test-refresh-secret') as any;
      expect(decoded.sub).toBe('user-123');
    });

    it('should throw an error if JWT_REFRESH_SECRET is not set', () => {
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => signRefreshToken('user-123')).toThrow('Variable de entorno requerida: JWT_REFRESH_SECRET');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token successfully', () => {
      process.env.JWT_SECRET = 'test-access-secret';

      const payload: JwtPayload = {
        sub: 'user-123',
        username: 'testuser',
        roles: ['ADMIN'],
        permisos: ['READ_ALL'],
      };

      const token = jwt.sign(payload, 'test-access-secret');

      const verified = verifyAccessToken(token);
      expect(verified.sub).toBe(payload.sub);
      expect(verified.username).toBe(payload.username);
      expect(verified.roles).toEqual(payload.roles);
      expect(verified.permisos).toEqual(payload.permisos);
    });

    it('should throw an error if token is invalid', () => {
      process.env.JWT_SECRET = 'test-access-secret';

      expect(() => verifyAccessToken('invalid.token.here')).toThrow();
    });

    it('should throw an error if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;

      expect(() => verifyAccessToken('any.token.here')).toThrow('Variable de entorno requerida: JWT_SECRET');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token successfully', () => {
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

      const token = jwt.sign({ sub: 'user-123' }, 'test-refresh-secret');

      const verified = verifyRefreshToken(token);
      expect(verified.sub).toBe('user-123');
    });

    it('should throw an error if token is invalid', () => {
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

      expect(() => verifyRefreshToken('invalid.token.here')).toThrow();
    });

    it('should throw an error if JWT_REFRESH_SECRET is not set', () => {
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => verifyRefreshToken('any.token.here')).toThrow('Variable de entorno requerida: JWT_REFRESH_SECRET');
    });
  it('should return the environment variable value if it exists', () => {
    process.env.TEST_KEY = 'test_value';
    expect(requireEnv('TEST_KEY')).toBe('test_value');
  });

  it('should throw an error if the environment variable is missing', () => {
    delete process.env.TEST_KEY;
    expect(() => requireEnv('TEST_KEY')).toThrow('Variable de entorno requerida: TEST_KEY');
  });

  it('should throw an error if the environment variable is an empty string', () => {
    process.env.TEST_KEY = '';
    expect(() => requireEnv('TEST_KEY')).toThrow('Variable de entorno requerida: TEST_KEY');
  });
});
