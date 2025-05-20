// qr-throttle.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class QrThrottleService {
  private readonly logger = new Logger(QrThrottleService.name);
  private readonly lastRequested = new Map<string, number>(); // userId -> timestamp
  // private readonly cooldownMs = 10_000; // 30 detik minimal antar request
  private readonly cooldownMs = 60_000; // 30 detik minimal antar request

  canRequest(userId: string): boolean {
    const now = Date.now();
    const last = this.lastRequested.get(userId) ?? 0;

    if (now - last < this.cooldownMs) {
      return false; // masih cooldown
    }

    this.lastRequested.set(userId, now);
    return true;
  }

  resetCooldown(userId: string): void {
    this.logger.log('delete cooldown');
    this.lastRequested.delete(userId);
  }
}
