export class OtpHelper {
  static generateOtp(length = 6): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  static getExpiry(minutes = 5): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }
}
