import { hashPassword, comparePassword } from './bcrypt';

describe('bcrypt wrapper functions', () => {
  const plainPassword = 'mySuperSecretPassword123!';

  it('should hash a password and be able to verify it', async () => {
    const hashedPassword = await hashPassword(plainPassword);

    // The hash should not be equal to the plain password
    expect(hashedPassword).not.toBe(plainPassword);
    // The hash should be a string and not empty
    expect(typeof hashedPassword).toBe('string');
    expect(hashedPassword.length).toBeGreaterThan(0);

    // It should verify correctly
    const isValid = await comparePassword(plainPassword, hashedPassword);
    expect(isValid).toBe(true);
  });

  it('should fail to verify with an incorrect password', async () => {
    const hashedPassword = await hashPassword(plainPassword);

    const isValid = await comparePassword('wrongpassword', hashedPassword);
    expect(isValid).toBe(false);
  });
});
