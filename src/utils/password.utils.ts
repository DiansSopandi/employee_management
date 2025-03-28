import * as bcryptjs from 'bcryptjs';

const SALT_ROUND = 10;

export class PasswordUtils {
  static async hashPassword(password: string): Promise<string> {
    return bcryptjs.hash(password, SALT_ROUND);
  }

  static async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  }
}
