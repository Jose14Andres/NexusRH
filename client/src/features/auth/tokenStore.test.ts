import { describe, it, expect, beforeEach } from 'vitest';
import { getAccessToken, setAccessToken } from './tokenStore';

describe('tokenStore', () => {
  beforeEach(() => {
    // Reset the token before each test to ensure isolation
    setAccessToken(null);
  });

  it('should initialize with a null token', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('should correctly store and retrieve a string token', () => {
    const testToken = 'sample-jwt-token-string';
    setAccessToken(testToken);
    expect(getAccessToken()).toBe(testToken);
  });

  it('should clear the token when set to null', () => {
    setAccessToken('temporary-token');
    expect(getAccessToken()).toBe('temporary-token');

    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });
});
