import { UserRole } from '../user-role.enum';

describe('UserRole Enum', () => {
  it('should have correct values for all roles', () => {
    expect(UserRole.USER).toBe('user');
    expect(UserRole.ADMIN).toBe('admin');
    expect(UserRole.MODERATOR).toBe('moderator');
  });

  it('should have exactly 3 roles', () => {
    const roles = Object.keys(UserRole);
    expect(roles).toHaveLength(3);
  });

  it('should have all lowercase values', () => {
    Object.values(UserRole).forEach((role) => {
      expect(role).toBe(role.toLowerCase());
    });
  });

  it('should be able to check if a value is a valid role', () => {
    const validRoles = Object.values(UserRole);
    
    expect(validRoles.includes('user' as UserRole)).toBe(true);
    expect(validRoles.includes('admin' as UserRole)).toBe(true);
    expect(validRoles.includes('moderator' as UserRole)).toBe(true);
    expect(validRoles.includes('invalid' as UserRole)).toBe(false);
  });
});