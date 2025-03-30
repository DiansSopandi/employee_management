import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private readonly logger: Logger,
  ) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService
      .validateUser({ email: email.toLowerCase(), password })
      .then((res) => res)
      .catch((err) => {
        this.logger.error('Error in LocalStrategy', err);
        return null;
      });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    return user;
  }
}
