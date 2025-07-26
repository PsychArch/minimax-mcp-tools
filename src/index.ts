#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Import refactored components
import { ConfigManager } from './config/config-manager.ts';
import { 
  imageGenerationSchema,
  textToSpeechSchema,
  taskBarrierSchema,
  validateImageParams,
  validateTTSParams,
  validateTaskBarrierParams
} from './config/schemas.ts';
import { ImageGenerationService } from './services/image-service.ts';
import { TextToSpeechService } from './services/tts-service.ts';
import { RateLimitedTaskManager } from './core/task-manager.ts';
import { ErrorHandler } from './utils/error-handler.ts';

// MCP Tool Response interface
interface ToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
}

// Initialize configuration and services
let config: ConfigManager;
let imageService: ImageGenerationService;
let ttsService: TextToSpeechService;
let taskManager: RateLimitedTaskManager;

try {
  config = ConfigManager.getInstance();
  config.validate();
  
  imageService = new ImageGenerationService();
  ttsService = new TextToSpeechService();
  taskManager = new RateLimitedTaskManager();
  
} catch (error: any) {
  console.error("❌ Failed to initialize:", ErrorHandler.formatErrorForUser(error));
  process.exit(1);
}

// Create MCP server
const server = new McpServer({
  name: "minimax-mcp-tools",
  version: "1.5.0",
  description: "Async Minimax AI integration for image generation and text-to-speech"
});

// Image generation tool
server.registerTool(
  "submit_image_generation",
  {
    title: "Submit Image Generation Task",
    description: "Generate images asynchronously. RECOMMENDED: Submit multiple tasks in batch to saturate rate limits, then call task_barrier once to wait for all completions. Returns task ID only - actual files available after task_barrier.",
    inputSchema: imageGenerationSchema.shape
  },
  async (params: unknown): Promise<ToolResponse> => {
    try {
      const validatedParams = validateImageParams(params);
      const { taskId } = await taskManager.submitImageTask(async () => {
        return await imageService.generateImage(validatedParams);
      });

      return {
        content: [{
          type: "text",
          text: `Task ${taskId} submitted`
        }]
      };
    } catch (error: any) {
      ErrorHandler.logError(error, { tool: 'submit_image_generation', params });
      return {
        content: [{
          type: "text",
          text: `❌ Failed to submit image generation task: ${ErrorHandler.formatErrorForUser(error)}`
        }]
      };
    }
  }
);

// Text-to-speech tool
server.registerTool(
  "submit_speech_generation",
  {
    title: "Submit Speech Generation Task", 
    description: "Convert text to speech asynchronously. RECOMMENDED: Submit multiple tasks in batch to saturate rate limits, then call task_barrier once to wait for all completions. Returns task ID only - actual files available after task_barrier.",
    inputSchema: textToSpeechSchema.shape
  },
  async (params: unknown): Promise<ToolResponse> => {
    try {
      const validatedParams = validateTTSParams(params);
      const { taskId } = await taskManager.submitTTSTask(async () => {
        return await ttsService.generateSpeech(validatedParams);
      });

      return {
        content: [{
          type: "text",
          text: `Task ${taskId} submitted`
        }]
      };
    } catch (error: any) {
      ErrorHandler.logError(error, { tool: 'submit_speech_generation', params });
      return {
        content: [{
          type: "text",
          text: `❌ Failed to submit TTS task: ${ErrorHandler.formatErrorForUser(error)}`
        }]
      };
    }
  }
);

// Task barrier tool
server.registerTool(
  "task_barrier",
  {
    title: "Wait for Task Completion",
    description: "Wait for ALL submitted tasks to complete and retrieve results. Essential for batch processing - submit multiple tasks first, then call task_barrier once to collect all results efficiently. Clears completed tasks.",
    inputSchema: taskBarrierSchema.shape
  },
  async (params: unknown): Promise<ToolResponse> => {
    try {
      const validatedParams = validateTaskBarrierParams(params);
      const { completed, results } = await taskManager.barrier();
      
      if (completed === 0) {
        return {
          content: [{
            type: "text",
            text: "ℹ️ No tasks were submitted before this barrier."
          }]
        };
      }

      // Format results
      const resultSummaries = results.map(({ taskId, success, result, error }) => {
        if (!success) {
          return `❌ Task ${taskId}: FAILED - ${error?.message || 'Unknown error'}`;
        }

        // Format success results based on task type
        if (result?.files) {
          // Image generation result
          const warnings = result.warnings ? ` (${result.warnings.length} warnings)` : '';
          return `✅ Task ${taskId}: Generated ${result.count} image(s)${warnings}`;
        } else if (result?.audioFile) {
          // TTS generation result
          const subtitles = result.subtitleFile ? ` + subtitles` : '';
          const warnings = result.warnings ? ` (${result.warnings.length} warnings)` : '';
          return `✅ Task ${taskId}: Generated speech${subtitles}${warnings}`;
        } else {
          // Generic success
          return `✅ Task ${taskId}: Completed successfully`;
        }
      });

      const summary = resultSummaries.join('\n');

      // Clear completed tasks to prevent memory leaks
      taskManager.clearCompletedTasks();

      return {
        content: [{
          type: "text",
          text: summary
        }]
      };
    } catch (error: any) {
      ErrorHandler.logError(error, { tool: 'task_barrier' });
      return {
        content: [{
          type: "text",
          text: `❌ Task barrier failed: ${ErrorHandler.formatErrorForUser(error)}`
        }]
      };
    }
  }
);


// Graceful shutdown
process.on('SIGINT', () => {
  console.error("🛑 Shutting down gracefully...");
  taskManager.clearCompletedTasks();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error("🛑 Received SIGTERM, shutting down...");
  taskManager.clearCompletedTasks();
  process.exit(0);
});

// Start server
console.error("Minimax MCP Tools Server v1.5.0.");

const transport = new StdioServerTransport();
await server.connect(transport);