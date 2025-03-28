import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly authService: AuthService) {
    super();
  }

  serializeUser(user: any, done: (err: any, id?: any) => void) {
    done(null, user.id);
  }

  async deserializeUser(id: number, done: (err: any, user?: any) => void) {
    const user = await this.authService.findUserById(id);
    return user ? done(null, user) : done(null, null);
  }
}
