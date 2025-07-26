# Minimax MCP Tools

![Banner](assets/banner.png)

A Model Context Protocol (MCP) server for Minimax AI integration, providing async image generation and text-to-speech with advanced rate limiting and error handling.

English | [简体中文](README.zh-CN.md)

## Quick Start

### 1. Prerequisites
- Node.js 18+
- Minimax API key from [platform.minimaxi.com](https://platform.minimaxi.com/)

### 2. Setup
```bash
# Set your API key
export MINIMAX_API_KEY="your_api_key_here"

# Install and run
npm install
npm start
```

### 3. MCP Configuration
Add to your MCP settings:
```json
{
  "mcpServers": {
    "minimax-mcp-tools": {
      "command": "node",
      "args": ["index.js"],
      "cwd": "/path/to/minimax-mcp-tools",
      "env": {
        "MINIMAX_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Tools

### `submit_image_generation`
Generate images asynchronously with rate limiting (10 RPM).

**Required:**
- `prompt`: Text description (max 1500 chars)
- `outputFile`: Absolute path for image file

**Optional:**
- `aspectRatio`: "1:1", "16:9", "4:3", etc. (default: "1:1")
- `n`: Number of images 1-9 (default: 1)
- `model`: "image-01" or "image-01-live" (default: "image-01")
- `subjectReference`: Reference image URL or local path
- `customSize`: `{width, height}` (512-2048, divisible by 8)

### `submit_speech_generation`
Convert text to speech asynchronously with rate limiting (20 RPM).

**Required:**
- `text`: Text to convert (max 10000 chars)
- `outputFile`: Absolute path for audio file

**Optional:**
- `model`: "speech-02-hd" or "speech-02-turbo" (default: "speech-02-hd")
- `voiceId`: Voice identifier (default: "female-shaonv"). Available voices:
  - **Chinese Male**: male-qn-qingse, male-qn-jingying, male-qn-badao, male-qn-daxuesheng
  - **Chinese Female**: female-shaonv, female-yujie, female-chengshu, female-tianmei
  - **Professional**: presenter_male, presenter_female, audiobook_male_1/2, audiobook_female_1/2
  - **Beta Quality**: *-jingpin versions of above voices
  - **Children/Character**: clever_boy, cute_boy, lovely_girl, cartoon_pig, bingjiao_didi, etc.
  - **English**: Santa_Claus, Grinch, Rudolph, Arnold, Charming_Santa, Charming_Lady, etc.
- `speed`: 0.5-2.0 (default: 1.0)
- `emotion`: "neutral", "happy", "sad", "angry", "fearful", "disgusted", "surprised" (default: "neutral")
- `format`: "mp3", "wav", "flac", "pcm" (default: "mp3")
- `volume`: 0.1-10.0 (default: 1.0)
- `pitch`: -12 to 12 (default: 0)

### `task_barrier`
Wait for all submitted tasks to complete and get results.

## Usage Example

```javascript
// Submit multiple tasks
await submit_image_generation({
  prompt: "A serene mountain landscape",
  outputFile: "/tmp/mountain.jpg",
  aspectRatio: "16:9"
});

await submit_speech_generation({
  text: "Hello world, this is a test",
  outputFile: "/tmp/speech.mp3",
  emotion: "happy"
});

// Wait for completion and get results
await task_barrier();
```

## Features

✅ **No Group ID Required** - Only API key needed  
✅ **Async Task Management** - Submit multiple tasks, wait with barrier  
✅ **Adaptive Rate Limiting** - Automatic adjustment based on API responses  
✅ **Comprehensive Error Handling** - Detailed error messages and recovery  
✅ **Production Ready** - Health checks, metrics, graceful shutdown  

## Architecture

- **Clean separation**: Config, services, utilities properly separated
- **Rate limiting**: Token bucket with burst capacity and adaptive adjustment
- **Error recovery**: Exponential backoff with circuit breaking
- **Validation**: Zod-based schemas with detailed error messages
- **Monitoring**: Built-in health checks and performance metrics

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MINIMAX_API_KEY` | *required* | Your Minimax API key |
| `LOG_LEVEL` | `error` | Logging level: `error` or `debug` |
| `MAX_CONCURRENCY` | `5` | Max concurrent tasks |
| `RETRY_ATTEMPTS` | `3` | Number of retry attempts |

## License

MIT