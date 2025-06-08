import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../../domain/services/user.service';
import { AuthProvider } from '@verpa/common';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {
    super({
      clientID: configService.get<string>('oauth.facebook.appId'),
      clientSecret: configService.get<string>('oauth.facebook.appSecret'),
      callbackURL: configService.get<string>('oauth.facebook.callbackUrl'),
      profileFields: ['id', 'emails', 'name', 'photos'],
      scope: ['email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: any,
  ): Promise<any> {
    try {
      const { id, emails, name, photos } = profile;
      const email = emails?.[0]?.value;

      if (!email) {
        return done(new Error('No email found'), null);
      }

      // Try to find user by OAuth provider
      let user = await this.userService.findByAuthProvider(AuthProvider.FACEBOOK, id);

      if (!user) {
        // Try to find by email
        user = await this.userService.findByEmail(email).catch(() => null);

        if (user) {
          // Link Facebook account to existing user
          await this.userService.linkAuthProvider(user._id.toString(), {
            provider: AuthProvider.FACEBOOK,
            providerId: id,
            email,
            linkedAt: new Date(),
          });
        } else {
          // Create new user
          user = await this.userService.createOAuthUser({
            email,
            username: email.split('@')[0] + '_fb_' + id.slice(0, 6),
            firstName: name?.givenName || 'Facebook',
            lastName: name?.familyName || 'User',
            avatar: photos?.[0]?.value,
            emailVerified: true,
            authProviders: [
              {
                provider: AuthProvider.FACEBOOK,
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