import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock database to avoid DATABASE_URL requirement
vi.mock('./db', () => ({
  db: {}
}));

import { hashPassword, verifyPassword } from './auth';

describe('Authentication Functions', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'mySecurePassword123';
      const hashed = await hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt format
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // bcrypt uses random salt
    });

    it('should handle empty string', async () => {
      const hashed = await hashPassword('');
      expect(hashed).toBeDefined();
      expect(hashed).toMatch(/^\$2[ayb]\$.{56}$/);
    });

    it('should handle long passwords', async () => {
      const longPassword = 'a'.repeat(200);
      const hashed = await hashPassword(longPassword);
      expect(hashed).toBeDefined();
    });

    it('should handle special characters', async () => {
      const password = '!@#$%^&*()_+-={}[]|:";\'<>?,./';
      const hashed = await hashPassword(password);
      expect(hashed).toBeDefined();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'correctPassword123';
      const hashed = await hashPassword(password);

      const isValid = await verifyPassword(password, hashed);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correctPassword';
      const hashed = await hashPassword(password);

      const isValid = await verifyPassword('wrongPassword', hashed);
      expect(isValid).toBe(false);
    });

    it('should be case sensitive', async () => {
      const password = 'Password123';
      const hashed = await hashPassword(password);

      expect(await verifyPassword('password123', hashed)).toBe(false);
      expect(await verifyPassword('PASSWORD123', hashed)).toBe(false);
      expect(await verifyPassword('Password123', hashed)).toBe(true);
    });

    it('should reject empty password against valid hash', async () => {
      const password = 'validPassword';
      const hashed = await hashPassword(password);

      const isValid = await verifyPassword('', hashed);
      expect(isValid).toBe(false);
    });

    it('should handle whitespace correctly', async () => {
      const password = 'pass word';
      const hashed = await hashPassword(password);

      expect(await verifyPassword('pass word', hashed)).toBe(true);
      expect(await verifyPassword('password', hashed)).toBe(false);
      expect(await verifyPassword(' pass word ', hashed)).toBe(false);
    });
  });

  describe('Password security', () => {
    it('should use bcrypt with appropriate cost factor', async () => {
      const password = 'testPassword';
      const hashed = await hashPassword(password);

      // Bcrypt hash format: $2a$10$... where 10 is the cost factor (saltRounds)
      const costFactor = parseInt(hashed.split('$')[2]);
      expect(costFactor).toBe(10);
    });

    it('should handle concurrent hash operations', async () => {
      const passwords = ['pass1', 'pass2', 'pass3', 'pass4', 'pass5'];
      const hashPromises = passwords.map(p => hashPassword(p));

      const hashes = await Promise.all(hashPromises);

      // All hashes should be unique
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(hashes.length);
    });

    it('should handle concurrent verify operations', async () => {
      const password = 'sharedPassword';
      const hashed = await hashPassword(password);

      const verifyPromises = Array(5).fill(null).map(() =>
        verifyPassword(password, hashed)
      );

      const results = await Promise.all(verifyPromises);
      expect(results).toEqual([true, true, true, true, true]);
    });
  });

  describe('Edge cases', () => {
    it('should handle unicode characters', async () => {
      const password = 'пароль123密码🔐';
      const hashed = await hashPassword(password);

      expect(await verifyPassword(password, hashed)).toBe(true);
      expect(await verifyPassword('пароль123', hashed)).toBe(false);
    });

    it('should handle very long passwords', async () => {
      // bcrypt has a 72 character limit
      const longPassword = 'x'.repeat(100);
      const hashed = await hashPassword(longPassword);

      expect(await verifyPassword(longPassword, hashed)).toBe(true);
      // Note: bcrypt truncates at 72 chars, so adding more won't change the hash
      const slightlyDifferent = 'y' + 'x'.repeat(99);
      expect(await verifyPassword(slightlyDifferent, hashed)).toBe(false);
    });

    it('should reject invalid hash format', async () => {
      const password = 'testPassword';
      const invalidHash = 'not-a-valid-bcrypt-hash';

      // bcrypt.compare returns false for invalid hash instead of throwing
      const result = await verifyPassword(password, invalidHash);
      expect(result).toBe(false);
    });

    it('should handle password with only spaces', async () => {
      const password = '     ';
      const hashed = await hashPassword(password);

      expect(await verifyPassword('     ', hashed)).toBe(true);
      expect(await verifyPassword('    ', hashed)).toBe(false);
      expect(await verifyPassword('      ', hashed)).toBe(false);
    });
  });

  describe('Real-world scenarios', () => {
    it('should simulate user registration and login', async () => {
      // Registration
      const userPassword = 'MySecureP@ssw0rd!';
      const hashedPassword = await hashPassword(userPassword);

      // Store in "database" (simulated)
      const userInDb = {
        username: 'testuser',
        password: hashedPassword
      };

      // Login attempt - correct password
      const loginPassword = 'MySecureP@ssw0rd!';
      const isAuthenticated = await verifyPassword(loginPassword, userInDb.password);
      expect(isAuthenticated).toBe(true);

      // Login attempt - incorrect password
      const wrongPassword = 'WrongPassword';
      const isRejected = await verifyPassword(wrongPassword, userInDb.password);
      expect(isRejected).toBe(false);
    });

    it('should handle password change workflow', async () => {
      const oldPassword = 'OldPassword123';
      const newPassword = 'NewPassword456';

      // Initial password
      const oldHash = await hashPassword(oldPassword);

      // Change password
      const newHash = await hashPassword(newPassword);

      // Old password should work with old hash
      expect(await verifyPassword(oldPassword, oldHash)).toBe(true);

      // New password should work with new hash
      expect(await verifyPassword(newPassword, newHash)).toBe(true);

      // Old password should NOT work with new hash
      expect(await verifyPassword(oldPassword, newHash)).toBe(false);

      // New password should NOT work with old hash
      expect(await verifyPassword(newPassword, oldHash)).toBe(false);
    });
  });
});
