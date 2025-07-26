import { MinimaxConfigError } from '../utils/error-handler.ts';

interface Config {
  apiKey: string;
  apiHost?: string;
  logLevel: 'error' | 'debug';
  tempDir: string;
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number;
}

interface RetryConfig {
  attempts: number;
  delay: number;
}

export class ConfigManager {
  private static instance: ConfigManager | null = null;
  private config!: Config;

  constructor() {
    if (ConfigManager.instance) {
      return ConfigManager.instance;
    }
    
    this.config = this.loadConfig();
    ConfigManager.instance = this;
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): Config {
    return {
      apiKey: this.getRequiredEnv('MINIMAX_API_KEY'),
      apiHost: process.env.MINIMAX_API_HOST,
      logLevel: (process.env.LOG_LEVEL as 'error' | 'debug') || 'error',
      tempDir: process.env.TEMP_DIR || '/tmp',
      maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '5', 10),
      retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
      retryDelay: parseInt(process.env.RETRY_DELAY || '1000', 10)
    };
  }

  private getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new MinimaxConfigError(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  get<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }

  getApiKey(): string {
    return this.config.apiKey;
  }

  getApiHost(): string | undefined {
    return this.config.apiHost;
  }

  getTempDir(): string {
    return this.config.tempDir;
  }

  getMaxConcurrency(): number {
    return this.config.maxConcurrency;
  }

  getRetryConfig(): RetryConfig {
    return {
      attempts: this.config.retryAttempts,
      delay: this.config.retryDelay
    };
  }

  isDebugMode(): boolean {
    return this.config.logLevel === 'debug';
  }

  // Validate configuration
  validate(): boolean {
    const required: Array<keyof Config> = ['apiKey'];
    const missing = required.filter(key => !this.config[key]);
    
    if (missing.length > 0) {
      throw new MinimaxConfigError(`Missing required configuration: ${missing.join(', ')}`);
    }

    return true;
  }
}