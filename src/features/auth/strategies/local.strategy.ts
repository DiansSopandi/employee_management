import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService
      .validateUser({ email: email.toLowerCase(), password })
      .then((res) => res)
      .catch((err) => {
        console.log({ LocalStrategyError: err });
      });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    return user;
  }
}
