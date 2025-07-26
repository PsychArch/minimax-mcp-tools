// Custom error classes for better error handling
export class MinimaxError extends Error {
  public readonly code: string;
  public readonly details: any;
  public readonly timestamp: string;

  constructor(message: string, code: string = 'MINIMAX_ERROR', details: any = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON(): {
    name: string;
    message: string;
    code: string;
    details: any;
    timestamp: string;
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

export class MinimaxConfigError extends MinimaxError {
  constructor(message: string, details: any = null) {
    super(message, 'CONFIG_ERROR', details);
  }
}

export class MinimaxAPIError extends MinimaxError {
  public readonly statusCode: number | null;
  public readonly response: any;

  constructor(message: string, statusCode: number | null = null, response: any = null) {
    super(message, 'API_ERROR', { statusCode, response });
    this.statusCode = statusCode;
    this.response = response;
  }
}

export class MinimaxValidationError extends MinimaxError {
  public readonly field: string | null;
  public readonly value: any;

  constructor(message: string, field: string | null = null, value: any = null) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.field = field;
    this.value = value;
  }
}

export class MinimaxNetworkError extends MinimaxError {
  public readonly originalError: Error | null;

  constructor(message: string, originalError: Error | null = null) {
    super(message, 'NETWORK_ERROR', { originalError: originalError?.message });
    this.originalError = originalError;
  }
}

export class MinimaxTimeoutError extends MinimaxError {
  public readonly timeout: number | null;

  constructor(message: string, timeout: number | null = null) {
    super(message, 'TIMEOUT_ERROR', { timeout });
    this.timeout = timeout;
  }
}

export class MinimaxRateLimitError extends MinimaxError {
  public readonly retryAfter: number | null;

  constructor(message: string, retryAfter: number | null = null) {
    super(message, 'RATE_LIMIT_ERROR', { retryAfter });
    this.retryAfter = retryAfter;
  }
}

// API Response interface for better typing
interface APIResponse {
  base_resp?: {
    status_code: number;
    status_msg?: string;
    retry_after?: number;
  };
}

// Error with common Node.js error properties
interface NodeError extends Error {
  code?: string;
  timeout?: number;
}

// Error handler utility functions
export class ErrorHandler {
  static handleAPIError(error: NodeError, response?: APIResponse): MinimaxError {
    // Handle different types of API errors
    if (response?.base_resp && response.base_resp.status_code !== 0) {
      const statusCode = response.base_resp.status_code;
      const message = response.base_resp.status_msg || 'API request failed';
      
      switch (statusCode) {
        case 1004:
          return new MinimaxAPIError(`Authentication failed: ${message}`, statusCode, response);
        case 1013:
          return new MinimaxRateLimitError(`Rate limit exceeded: ${message}`, response.base_resp?.retry_after);
        default:
          return new MinimaxAPIError(message, statusCode, response);
      }
    }

    // Handle HTTP errors
    if (error.message && error.message.includes('HTTP')) {
      const match = error.message.match(/HTTP (\d+):/);
      const statusCode = match ? parseInt(match[1]!, 10) : null;
      
      switch (statusCode) {
        case 401:
          return new MinimaxAPIError('Unauthorized: Invalid API key', statusCode!);
        case 403:
          return new MinimaxAPIError('Forbidden: Access denied', statusCode!);
        case 404:
          return new MinimaxAPIError('Not found: Invalid endpoint', statusCode!);
        case 429:
          return new MinimaxRateLimitError('Rate limit exceeded', null);
        case 500:
          return new MinimaxAPIError('Internal server error', statusCode!);
        default:
          return new MinimaxAPIError(error.message, statusCode!);
      }
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new MinimaxNetworkError('Network connection failed', error);
    }

    // Handle timeout errors
    if (error.name === 'AbortError' || (error.message && error.message.includes('timeout'))) {
      return new MinimaxTimeoutError('Request timeout', error.timeout);
    }

    // Default to generic error
    return new MinimaxError(error.message || 'Unknown error occurred');
  }

  static formatErrorForUser(error: Error): string {
    if (error instanceof MinimaxConfigError) {
      return `Configuration Error: ${error.message}`;
    }
    
    if (error instanceof MinimaxValidationError) {
      return `Validation Error: ${error.message}`;
    }
    
    if (error instanceof MinimaxAPIError) {
      return `API Error: ${error.message}`;
    }
    
    if (error instanceof MinimaxNetworkError) {
      return `Network Error: ${error.message}`;
    }
    
    if (error instanceof MinimaxTimeoutError) {
      return `Timeout Error: ${error.message}`;
    }
    
    if (error instanceof MinimaxRateLimitError) {
      return `Rate Limit Error: ${error.message}`;
    }
    
    return `Error: ${error.message}`;
  }

  static logError(error: Error, context: Record<string, any> = {}): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: error instanceof MinimaxError ? error.toJSON() : {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    };
    
    if (typeof console !== 'undefined') {
      console.error('[MINIMAX-ERROR]', JSON.stringify(logEntry, null, 2));
    }
  }
}