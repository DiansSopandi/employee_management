// src/rate-limiter/throttler-types.ts
export interface ThrottlerStorageRecordLocal {
  totalHits: number;
  timeToExpire: number;
}
