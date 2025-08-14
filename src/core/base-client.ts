import fetch from 'node-fetch';
import type { RequestInit, Response } from 'node-fetch';
import { ConfigManager } from '../config/config-manager.js';
import { API_CONFIG } from '../config/constants.js';
import { ErrorHandler, MinimaxError } from '../utils/error-handler.js';

interface BaseClientOptions {
  baseURL?: string;
  timeout?: number;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  headers?: Record<string, string>;
}

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  error?: string;
}

interface APIResponse {
  base_resp?: {
    status_code: number;
    status_msg?: string;
  };
  [key: string]: any;
}

export class MinimaxBaseClient {
  protected config: ConfigManager;
  protected baseURL: string;
  protected timeout: number;
  protected retryConfig: { attempts: number; delay: number };

  constructor(options: BaseClientOptions = {}) {
    this.config = ConfigManager.getInstance();
    this.baseURL = options.baseURL || API_CONFIG.BASE_URL;
    this.timeout = options.timeout || API_CONFIG.TIMEOUT;
    this.retryConfig = this.config.getRetryConfig();
  }

  async makeRequest(endpoint: string, options: RequestOptions = {}): Promise<APIResponse> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.getApiKey()}`,
      'Content-Type': 'application/json',
      ...API_CONFIG.HEADERS,
      ...options.headers
    };

    const requestOptions: RequestInit & { timeout?: number } = {
      method: options.method || 'POST',
      headers,
      timeout: this.timeout,
      ...options
    };

    if (options.body && requestOptions.method !== 'GET') {
      requestOptions.body = JSON.stringify(options.body);
    }

    return this.executeWithRetry(url, requestOptions);
  }

  private async executeWithRetry(url: string, requestOptions: RequestInit & { timeout?: number }, attempt: number = 1): Promise<APIResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response: Response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json() as APIResponse;
      return this.processResponse(data);

    } catch (error: any) {
      const processedError = ErrorHandler.handleAPIError(error);

      // Retry logic for certain errors
      if (this.shouldRetry(processedError, attempt)) {
        await this.delay(this.retryConfig.delay * attempt);
        return this.executeWithRetry(url, requestOptions, attempt + 1);
      }

      throw processedError;
    }
  }

  private processResponse(data: APIResponse): APIResponse {
    // Check for API-level errors in response
    if (data.base_resp && data.base_resp.status_code !== 0) {
      throw ErrorHandler.handleAPIError(new Error('API Error'), data);
    }

    return data;
  }

  private shouldRetry(error: MinimaxError, attempt: number): boolean {
    if (attempt >= this.retryConfig.attempts) {
      return false;
    }

    // Retry on network errors, timeouts, and 5xx errors
    return (
      error.code === 'NETWORK_ERROR' ||
      error.code === 'TIMEOUT_ERROR' ||
      ('statusCode' in error && typeof error.statusCode === 'number' && error.statusCode >= 500 && error.statusCode < 600)
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async get(endpoint: string, options: RequestOptions = {}): Promise<APIResponse> {
    return this.makeRequest(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint: string, body?: any, options: RequestOptions = {}): Promise<APIResponse> {
    return this.makeRequest(endpoint, { ...options, method: 'POST', body });
  }

  // Health check method
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      // Make a simple request to verify connectivity
      await this.get('/health');
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error: any) {
      return { 
        status: 'unhealthy', 
        error: ErrorHandler.formatErrorForUser(error),
        timestamp: new Date().toISOString() 
      };
    }
  }
}