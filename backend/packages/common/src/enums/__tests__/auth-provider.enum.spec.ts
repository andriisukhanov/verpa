import { AuthProvider } from '../auth-provider.enum';

describe('AuthProvider Enum', () => {
  it('should have correct values for all auth providers', () => {
    expect(AuthProvider.LOCAL).toBe('local');
    expect(AuthProvider.GOOGLE).toBe('google');
    expect(AuthProvider.APPLE).toBe('apple');
    expect(AuthProvider.FACEBOOK).toBe('facebook');
  });

  it('should have exactly 4 auth providers', () => {
    const providers = Object.keys(AuthProvider);
    expect(providers).toHaveLength(4);
  });

  it('should have all lowercase values', () => {
    Object.values(AuthProvider).forEach((provider) => {
      expect(provider).toBe(provider.toLowerCase());
    });
  });

  it('should be able to check if a value is a valid auth provider', () => {
    const validProviders = Object.values(AuthProvider);
    
    expect(validProviders.includes('local' as AuthProvider)).toBe(true);
    expect(validProviders.includes('google' as AuthProvider)).toBe(true);
    expect(validProviders.includes('apple' as AuthProvider)).toBe(true);
    expect(validProviders.includes('facebook' as AuthProvider)).toBe(true);
    expect(validProviders.includes('invalid' as AuthProvider)).toBe(false);
  });

  it('should include all major OAuth providers', () => {
    const oauthProviders = [AuthProvider.GOOGLE, AuthProvider.APPLE, AuthProvider.FACEBOOK];
    expect(oauthProviders).toHaveLength(3);
    
    oauthProviders.forEach((provider) => {
      expect(Object.values(AuthProvider)).toContain(provider);
    });
  });

  it('should have local provider for email/password auth', () => {
    expect(AuthProvider.LOCAL).toBeDefined();
    expect(AuthProvider.LOCAL).toBe('local');
  });
});