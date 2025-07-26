# Minimax MCP Tools

![Banner](assets/banner.png)

A Model Context Protocol (MCP) server for Minimax AI integration, providing async image generation and text-to-speech with advanced rate limiting and error handling.

English | [简体中文](README.zh-CN.md)

### MCP Configuration
Add to your MCP settings:
```json
{
  "mcpServers": {
    "minimax-mcp-tools": {
      "command": "npx",
      "args": ["minimax-mcp-tools"],
      "env": {
        "MINIMAX_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Async Design - Perfect for Content Production at Scale

This MCP server uses an **asynchronous submit-and-barrier pattern** designed for **batch content creation**:

🎬 **Narrated Slideshow Production** - Generate dozens of slide images and corresponding narration in parallel  
📚 **AI-Driven Audiobook Creation** - Produce chapters with multiple voice characters simultaneously  
🖼️ **Website Asset Generation** - Create consistent visual content and audio elements for web projects  
🎯 **Multimedia Content Pipelines** - Perfect for LLM-driven content workflows requiring both visuals and audio

### Architecture Benefits:
1. **Submit Phase**: Tools return immediately with task IDs, tasks execute in background
2. **Smart Rate Limiting**: Adaptive rate limiting (10 RPM images, 20 RPM speech) with burst capacity 
3. **Barrier Synchronization**: `task_barrier` waits for all tasks and returns comprehensive results
4. **Batch Optimization**: Submit multiple tasks to saturate rate limits, then barrier once for maximum throughput



## Tools

### `submit_image_generation`
**Submit Image Generation Task** - Generate images asynchronously. 

**Required:** `prompt`, `outputFile`  
**Optional:** `aspectRatio`, `customSize`, `seed`, `subjectReference`, `style`

### `submit_speech_generation`
**Submit Speech Generation Task** - Convert text to speech asynchronously.

**Required:** `text`, `outputFile`  
**Optional:** `highQuality`, `voiceId`, `speed`, `volume`, `pitch`, `emotion`, `format`, `sampleRate`, `bitrate`, `languageBoost`, `intensity`, `timbre`, `sound_effects`

### `task_barrier`
**Wait for Task Completion** - Wait for ALL submitted tasks to complete and retrieve results. Essential for batch processing.

## Architecture
```mermaid
sequenceDiagram
    participant User
    participant MCP as MCP Server
    participant TM as Task Manager
    participant API as Minimax API

    Note over User, API: Async Submit-and-Barrier Pattern

    User->>MCP: submit_image_generation(prompt1)
    MCP->>TM: submitImageTask()
    TM-->>MCP: taskId: img-001
    MCP-->>User: "Task img-001 submitted"
    
    par Background Execution (Rate Limited)
        TM->>API: POST /image/generate
        API-->>TM: image data + save file
    end

    User->>MCP: submit_speech_generation(text1)
    MCP->>TM: submitTTSTask()
    TM-->>MCP: taskId: tts-002
    MCP-->>User: "Task tts-002 submitted"
    
    par Background Execution (Rate Limited)
        TM->>API: POST /speech/generate
        API-->>TM: audio data + save file
    end

    User->>MCP: submit_image_generation(prompt2)
    MCP->>TM: submitImageTask()
    TM-->>MCP: taskId: img-003
    MCP-->>User: "Task img-003 submitted"

    par Background Execution (Rate Limited)
        TM->>API: POST /image/generate (queued)
        API-->>TM: image data + save file
    end

    User->>MCP: task_barrier()
    MCP->>TM: barrier()
    TM->>TM: wait for all tasks
    TM-->>MCP: results summary
    MCP-->>User: ✅ All tasks completed<br/>Files available at specified paths

    Note over User, API: Immediate Task Submission + Background Rate-Limited Execution
```

## License
MIT