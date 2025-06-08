import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../../domain/services/user.service';
import { AuthProvider } from '@verpa/common';
import * as fs from 'fs';
import * as path from 'path';

export interface AppleProfile {
  sub: string; // Unique identifier
  email?: string;
  email_verified?: boolean;
  name?: {
    firstName?: string;
    lastName?: string;
  };
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {
    const privateKeyPath = configService.get<string>('oauth.apple.privateKeyPath');
    const privateKey = fs.readFileSync(path.resolve(privateKeyPath), 'utf8');

    super({
      clientID: configService.get<string>('oauth.apple.clientId'),
      teamID: configService.get<string>('oauth.apple.teamId'),
      keyID: configService.get<string>('oauth.apple.keyId'),
      privateKey,
      callbackURL: configService.get<string>('oauth.apple.callbackUrl'),
      passReqToCallback: false,
      scope: ['email', 'name'],
    });
  }

  async validate(
    idToken: string,
    profile: AppleProfile,
    done: any,
  ): Promise<any> {
    try {
      const { sub: appleId, email, name } = profile;

      // Apple doesn't always provide email after first sign-in
      if (!email && !appleId) {
        return done(new Error('No identifier found'), null);
      }

      // Try to find user by OAuth provider
      let user = await this.userService.findByAuthProvider(AuthProvider.APPLE, appleId);

      if (!user && email) {
        // Try to find by email
        user = await this.userService.findByEmail(email).catch(() => null);

        if (user) {
          // Link Apple account to existing user
          await this.userService.linkAuthProvider(user._id.toString(), {
            provider: AuthProvider.APPLE,
            providerId: appleId,
            email,
            linkedAt: new Date(),
          });
        }
      }

      if (!user) {
        // Create new user
        const username = email 
          ? email.split('@')[0] + '_' + appleId.slice(0, 6)
          : 'apple_user_' + appleId.slice(0, 8);

        user = await this.userService.createOAuthUser({
          email: email || `${appleId}@apple.local`,
          username,
          firstName: name?.firstName || 'Apple',
          lastName: name?.lastName || 'User',
          emailVerified: !!email && profile.email_verified,
          authProviders: [
            {
              provider: AuthProvider.APPLE,
              providerId: appleId,
              email,
              linkedAt: new Date(),
            },
          ],
        });
      }

      const tokens = await this.authService.generateTokensForUser(user);
      return done(null, { user, ...tokens });
    } catch (error) {
      return done(error as Error, null);
    }
  }
}