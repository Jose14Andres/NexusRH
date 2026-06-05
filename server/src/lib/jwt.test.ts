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
