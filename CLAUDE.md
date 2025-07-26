# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a production-ready Model Context Protocol (MCP) server that integrates with Minimax AI APIs for asynchronous image generation and text-to-speech functionality. The server features advanced rate limiting, error handling, and task management.

**MCP Tools Available:**
- `submit_image_generation`: Asynchronous image generation with rate limiting (10 RPM)
- `submit_speech_generation`: Asynchronous text-to-speech with rate limiting (20 RPM)  
- `task_barrier`: Wait for all submitted tasks and get comprehensive results
- `health_check`: System health and performance metrics

## Development Commands

### Building and Running
```bash
npm run build      # Compile TypeScript to JavaScript
npm start          # Production mode (requires build first)
npm run dev        # Development mode with ts-node
npm run dev:watch  # Development mode with automatic restart
```

### Dependencies
```bash
npm install        # Install all dependencies
```

### Publishing
```bash
npm run prepublishOnly  # Build before publishing (runs automatically)
```

### TypeScript Development
- Source files are in `src/` with `.ts` extensions
- Compiled JavaScript output goes to `dist/`
- Use `npm run dev` for development with hot reloading
- Use `npm run build` before publishing or deployment

### Testing
Currently no test suite exists. The test script will exit with an error.

## Architecture Overview

This is a **clean, modular TypeScript architecture** with strict type safety and clear separation of concerns:

### Core Layer (`src/core/`)
- **`task-manager.ts`**: Async task management with two classes:
  - `TaskManager`: Basic task submission, tracking, and barrier synchronization
  - `RateLimitedTaskManager`: Extends TaskManager with adaptive rate limiting for image/TTS APIs
- **`rate-limiter.ts`**: Token bucket rate limiting with two implementations:
  - `RateLimiter`: Basic token bucket algorithm with configurable RPM and burst
  - `AdaptiveRateLimiter`: Self-adjusting rate limits based on consecutive API errors
- **`base-client.ts`**: Abstract HTTP client with retry logic and error handling

### Services Layer (`src/services/`)
- **`image-service.ts`**: Image generation service extending MinimaxBaseClient
- **`tts-service.ts`**: Text-to-speech service extending MinimaxBaseClient
- Both services handle file I/O, API communication, and error processing with full type safety

### Configuration Layer (`src/config/`)
- **`config-manager.ts`**: Singleton configuration manager with environment validation
- **`constants.ts`**: API endpoints, rate limits, model configs, voice definitions, parameter constraints with exported types
- **`schemas.ts`**: Zod validation schemas with TypeScript type inference for all MCP tool parameters

### Utilities (`src/utils/`)
- **`error-handler.ts`**: Centralized error processing with custom error classes and type safety
- **`file-handler.ts`**: File I/O operations with directory creation and validation

### Entry Point
- **`src/index.ts`**: MCP server setup, tool registration, graceful shutdown handling with full TypeScript support

## Key Architectural Patterns

### Async Task Management
The system uses a **submit-and-barrier pattern**:
1. Submit multiple tasks asynchronously (returns immediately with task ID)
2. Tasks execute in background with rate limiting
3. Use `task_barrier()` to wait for completion and get all results

### Rate Limiting Strategy
- **Token bucket algorithm** with configurable RPM and burst capacity
- **Adaptive rate limiting** automatically reduces rates on consecutive API errors
- **Separate rate limiters** for image (10 RPM) and TTS (20 RPM) APIs
- **Gradual recovery** after successful API calls

### Error Handling Hierarchy
- **API-specific errors**: MinimaxAPIError, MinimaxRateLimitError
- **Configuration errors**: MinimaxConfigError  
- **Generic errors**: MinimaxError base class
- **Centralized processing** with user-friendly error formatting

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `MINIMAX_API_KEY` | - | ✅ | Minimax API key |
| `LOG_LEVEL` | `error` | ❌ | `error` or `debug` |
| `MAX_CONCURRENCY` | `5` | ❌ | Max concurrent tasks |
| `RETRY_ATTEMPTS` | `3` | ❌ | API retry attempts |
| `RETRY_DELAY` | `1000` | ❌ | Retry delay (ms) |
| `TEMP_DIR` | `/tmp` | ❌ | Temporary file directory |

## Common Development Patterns

### TypeScript Best Practices
- All code is fully typed with strict TypeScript configuration
- Use exported types from `constants.ts` for API parameters (`ImageModel`, `TTSModel`, `VoiceId`, etc.)
- Leverage Zod schema types with `z.infer<>` for automatic type inference
- Interface definitions are provided for all API responses and internal data structures

### Service Extension
When adding new Minimax APIs, extend `MinimaxBaseClient` and implement the service pattern used in `ImageGenerationService` and `TextToSpeechService`:
```typescript
export class NewService extends MinimaxBaseClient {
  async performOperation(params: NewServiceParams): Promise<NewServiceResult> {
    // Implementation with full type safety
  }
}
```

### Rate Limiter Integration
New services should integrate with `RateLimitedTaskManager` using the submit pattern:
```typescript
await taskManager.submitCustomTask('api-type', async () => {
  return await customService.performOperation(params);
});
```

### Configuration Management
Access configuration through the singleton `ConfigManager.getInstance()`. Add new environment variables to the `loadConfig()` method with proper typing.

### Error Handling
- Use `ErrorHandler.handleAPIError()` for API responses with proper error type handling
- Log errors with `ErrorHandler.logError(error, context)` 
- Format user messages with `ErrorHandler.formatErrorForUser(error)`
- All custom error classes extend `MinimaxError` with type-safe properties

### File Operations
Use `FileHandler` utilities for consistent file operations with proper error handling, directory creation, and TypeScript type safety.

### Schema Validation
- Use Zod schemas from `schemas.ts` for runtime validation
- Types are automatically inferred: `ImageGenerationParams`, `TextToSpeechParams`, `TaskBarrierParams`
- Validation helper functions provide type-safe parsing with detailed error messages