// qr-throttle.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class QrThrottleService {
  private readonly lastRequested = new Map<string, number>(); // userId -> timestamp
  // private readonly cooldownMs = 10_000; // 30 detik minimal antar request
  private readonly cooldownMs = 10_000; // 30 detik minimal antar request

  canRequest(userId: string): boolean {
    const now = Date.now();
    const last = this.lastRequested.get(userId) ?? 0;

    if (now - last < this.cooldownMs) {
      return false; // masih cooldown
    }

    this.lastRequested.set(userId, now);
    return true;
  }
}
