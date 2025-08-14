import { AdaptiveRateLimiter } from './rate-limiter.js';
import { RATE_LIMITS } from '../config/constants.js';
import { MinimaxError, ErrorHandler } from '../utils/error-handler.js';

// Type definitions
interface TaskResult {
  success: boolean;
  result?: any;
  error?: MinimaxError;
  completedAt: number;
}

interface TaskSubmissionResult {
  taskId: string;
  promise: Promise<any>;
}

interface BarrierResult {
  completed: number;
  results: (TaskResult & { taskId: string })[];
}

interface TaskStatus {
  status: 'running' | 'completed' | 'not_found';
  taskId: string;
  success?: boolean;
  result?: any;
  error?: MinimaxError;
  completedAt?: number;
}

interface AllTasksStatus {
  running: Array<{ taskId: string; status: 'running' }>;
  completed: Array<{ taskId: string; status: 'completed' } & TaskResult>;
  total: number;
}

interface TaskStats {
  activeTasks: number;
  completedTasks: number;
  totalProcessed: number;
}

interface TaskMetrics {
  requests: number;
  successes: number;
  errors: number;
}

interface RateLimitedTaskManagerOptions {
  backoffFactor?: number;
  recoveryFactor?: number;
}

export class TaskManager {
  protected tasks: Map<string, Promise<any>>;
  protected completedTasks: Map<string, TaskResult>;
  protected taskCounter: number;

  constructor() {
    this.tasks = new Map();
    this.completedTasks = new Map();
    this.taskCounter = 0;
  }

  protected generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async submit(fn: () => Promise<any>, taskId: string | null = null): Promise<TaskSubmissionResult> {
    taskId = taskId || this.generateTaskId();
    
    const taskPromise = Promise.resolve()
      .then(fn)
      .then(result => {
        this.completedTasks.set(taskId!, { success: true, result, completedAt: Date.now() });
        return result;
      })
      .catch(error => {
        const processedError = ErrorHandler.handleAPIError(error);
        this.completedTasks.set(taskId!, { success: false, error: processedError, completedAt: Date.now() });
        throw processedError;
      })
      .finally(() => {
        this.tasks.delete(taskId!);
      });

    this.tasks.set(taskId, taskPromise);
    return { taskId, promise: taskPromise };
  }

  async barrier(): Promise<BarrierResult> {
    const activeTasks = Array.from(this.tasks.values());
    
    // Wait for any active tasks to complete
    if (activeTasks.length > 0) {
      await Promise.allSettled(activeTasks);
    }

    // Return all completed tasks (including those completed before this barrier call)
    const results = Array.from(this.completedTasks.entries()).map(([taskId, taskResult]) => ({
      taskId,
      ...taskResult
    }));

    return { completed: results.length, results };
  }

  getTaskStatus(taskId: string): TaskStatus {
    if (this.tasks.has(taskId)) {
      return { status: 'running', taskId };
    }
    
    if (this.completedTasks.has(taskId)) {
      return { status: 'completed', taskId, ...this.completedTasks.get(taskId)! };
    }
    
    return { status: 'not_found', taskId };
  }

  getAllTasksStatus(): AllTasksStatus {
    const running = Array.from(this.tasks.keys()).map(taskId => ({ taskId, status: 'running' as const }));
    const completed = Array.from(this.completedTasks.entries()).map(([taskId, result]) => ({
      taskId,
      status: 'completed' as const,
      ...result
    }));
    
    return { running, completed, total: running.length + completed.length };
  }

  clearCompletedTasks(): number {
    const count = this.completedTasks.size;
    this.completedTasks.clear();
    return count;
  }

  getStats(): TaskStats {
    return {
      activeTasks: this.tasks.size,
      completedTasks: this.completedTasks.size,
      totalProcessed: this.taskCounter
    };
  }
}

export class RateLimitedTaskManager extends TaskManager {
  private rateLimiters: {
    image: AdaptiveRateLimiter;
    tts: AdaptiveRateLimiter;
  };
  private metrics: {
    image: TaskMetrics;
    tts: TaskMetrics;
  };

  constructor(options: RateLimitedTaskManagerOptions = {}) {
    super();
    
    this.rateLimiters = {
      image: new AdaptiveRateLimiter({
        ...RATE_LIMITS.IMAGE,
        backoffFactor: options.backoffFactor || 0.7,
        recoveryFactor: options.recoveryFactor || 1.05
      }),
      tts: new AdaptiveRateLimiter({
        ...RATE_LIMITS.TTS,
        backoffFactor: options.backoffFactor || 0.7,
        recoveryFactor: options.recoveryFactor || 1.05
      })
    };
    
    this.metrics = {
      image: { requests: 0, successes: 0, errors: 0 },
      tts: { requests: 0, successes: 0, errors: 0 }
    };
  }

  async submitImageTask(fn: () => Promise<any>, taskId: string | null = null): Promise<TaskSubmissionResult> {
    return this.submitRateLimitedTask('image', fn, taskId);
  }

  async submitTTSTask(fn: () => Promise<any>, taskId: string | null = null): Promise<TaskSubmissionResult> {
    return this.submitRateLimitedTask('tts', fn, taskId);
  }

  private async submitRateLimitedTask(type: 'image' | 'tts', fn: () => Promise<any>, taskId: string | null = null): Promise<TaskSubmissionResult> {
    const rateLimiter = this.rateLimiters[type];
    if (!rateLimiter) {
      throw new MinimaxError(`Unknown task type: ${type}`);
    }

    const wrappedFn = async () => {
      await rateLimiter.acquire();
      this.metrics[type].requests++;
      
      try {
        const result = await fn();
        this.metrics[type].successes++;
        rateLimiter.onSuccess();
        return result;
      } catch (error: any) {
        this.metrics[type].errors++;
        rateLimiter.onError(error);
        throw error;
      }
    };

    return this.submit(wrappedFn, taskId);
  }

  getRateLimiterStatus() {
    return {
      image: this.rateLimiters.image.getAdaptiveStatus(),
      tts: this.rateLimiters.tts.getAdaptiveStatus()
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      rateLimiters: this.getRateLimiterStatus()
    };
  }

  resetMetrics(): void {
    this.metrics = {
      image: { requests: 0, successes: 0, errors: 0 },
      tts: { requests: 0, successes: 0, errors: 0 }
    };
    
    Object.values(this.rateLimiters).forEach(limiter => limiter.reset());
  }
}