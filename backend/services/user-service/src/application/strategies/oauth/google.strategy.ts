import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../../domain/services/user.service';
import { AuthProvider } from '@verpa/common';

export interface GoogleProfile {
  id: string;
  emails: Array<{ value: string; verified: boolean }>;
  name: {
    givenName: string;
    familyName: string;
  };
  photos: Array<{ value: string }>;
  provider: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {
    super({
      clientID: configService.get<string>('oauth.google.clientId'),
      clientSecret: configService.get<string>('oauth.google.clientSecret'),
      callbackURL: configService.get<string>('oauth.google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, emails, name, photos } = profile;
      const email = emails[0]?.value;

      if (!email) {
        return done(new Error('No email found'), null);
      }

      // Try to find user by OAuth provider
      let user = await this.userService.findByAuthProvider(AuthProvider.GOOGLE, id);

      if (!user) {
        // Try to find by email
        user = await this.userService.findByEmail(email).catch(() => null);

        if (user) {
          // Link Google account to existing user
          await this.userService.linkAuthProvider(user._id.toString(), {
            provider: AuthProvider.GOOGLE,
            providerId: id,
            email,
            linkedAt: new Date(),
          });
        } else {
          // Create new user
          user = await this.userService.createOAuthUser({
            email,
            username: email.split('@')[0] + '_' + id.slice(0, 6),
            firstName: name.givenName,
            lastName: name.familyName,
            avatar: photos[0]?.value,
            emailVerified: true,
            authProviders: [
              {
                provider: AuthProvider.GOOGLE,
                providerId: id,
                email,
                linkedAt: new Date(),
              },
            ],
          });
        }
      }

      const tokens = await this.authService.generateTokensForUser(user);
      return done(null, { user, ...tokens });
    } catch (error) {
      return done(error as Error, null);
    }
  }
}