import { MinimaxRateLimitError } from '../utils/error-handler.ts';

interface RateLimiterConfig {
  rpm: number;
  burst?: number;
  window?: number;
}

interface AdaptiveRateLimiterConfig extends RateLimiterConfig {
  backoffFactor?: number;
  recoveryFactor?: number;
  maxBackoff?: number;
}

interface QueueRequest {
  resolve: () => void;
  reject: (error: Error) => void;
  timestamp: number;
}

interface RateLimiterStatus {
  tokens: number;
  queueLength: number;
  rpm: number;
  burst: number;
}

interface AdaptiveStatus extends RateLimiterStatus {
  consecutiveErrors: number;
  adaptedRpm: number;
  originalRpm: number;
}

export class RateLimiter {
  protected rpm: number;
  protected burst: number;
  protected window: number;
  protected interval: number;
  protected tokens: number;
  protected lastRefill: number;
  protected queue: QueueRequest[];

  constructor({ rpm, burst = 1, window = 60000 }: RateLimiterConfig) {
    this.rpm = rpm;
    this.burst = burst;
    this.window = window;
    this.interval = window / rpm;
    
    // Token bucket algorithm
    this.tokens = burst;
    this.lastRefill = Date.now();
    this.queue = [];
  }

  async acquire(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ resolve, reject, timestamp: Date.now() });
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.queue.length === 0) return;

    this.refillTokens();

    while (this.queue.length > 0 && this.tokens > 0) {
      const request = this.queue.shift();
      if (!request) break;
      
      this.tokens--;
      
      // Schedule the next refill
      const delay = Math.max(0, this.interval - (Date.now() - this.lastRefill));
      setTimeout(() => this.processQueue(), delay);
      
      request.resolve();
    }
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.interval);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.burst, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  getStatus(): RateLimiterStatus {
    this.refillTokens();
    return {
      tokens: this.tokens,
      queueLength: this.queue.length,
      rpm: this.rpm,
      burst: this.burst
    };
  }

  reset(): void {
    this.tokens = this.burst;
    this.lastRefill = Date.now();
    this.queue = [];
  }
}

export class AdaptiveRateLimiter extends RateLimiter {
  private consecutiveErrors: number;
  private lastErrorTime: number;
  private originalRpm: number;
  private backoffFactor: number;
  private recoveryFactor: number;
  private maxBackoff: number;

  constructor(config: AdaptiveRateLimiterConfig) {
    super(config);
    this.consecutiveErrors = 0;
    this.lastErrorTime = 0;
    this.originalRpm = this.rpm;
    this.backoffFactor = config.backoffFactor || 0.5;
    this.recoveryFactor = config.recoveryFactor || 1.1;
    this.maxBackoff = config.maxBackoff || 5;
  }

  onSuccess(): void {
    // Gradually recover rate limit after success
    if (this.consecutiveErrors > 0) {
      this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 1);
      
      if (this.consecutiveErrors === 0) {
        this.rpm = Math.min(this.originalRpm, this.rpm * this.recoveryFactor);
        this.interval = this.window / this.rpm;
      }
    }
  }

  onError(error: Error): void {
    if (error instanceof MinimaxRateLimitError) {
      this.consecutiveErrors++;
      this.lastErrorTime = Date.now();
      
      // Reduce rate limit on consecutive errors
      const backoffMultiplier = Math.pow(this.backoffFactor, Math.min(this.consecutiveErrors, this.maxBackoff));
      this.rpm = Math.max(1, this.originalRpm * backoffMultiplier);
      this.interval = this.window / this.rpm;
      
      // Clear some tokens to enforce the new limit
      this.tokens = Math.min(this.tokens, Math.floor(this.burst * backoffMultiplier));
    }
  }

  getAdaptiveStatus(): AdaptiveStatus {
    return {
      ...this.getStatus(),
      consecutiveErrors: this.consecutiveErrors,
      adaptedRpm: this.rpm,
      originalRpm: this.originalRpm
    };
  }
}