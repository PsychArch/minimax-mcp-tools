# Minimax MCP Tools

![Minimax MCP Tools Banner](assets/minimax-mcp-tools-banner.jpg)

A Model Context Protocol (MCP) server implementation with Minimax API integration for AI-powered image generation and text-to-speech functionality.

## Features

- **Image Generation**: Generate high-quality images based on text prompts using Minimax's image-01 model
- **Text-to-Speech (TTS)**: Convert text to natural-sounding speech with various voice options, emotions, and audio formats
- **Easy Integration**: Seamlessly integrates with Windsurf editor as an MCP server

## Setup

### Prerequisites

- Node.js 16 or higher
- A Minimax API key (obtain from [Minimax Platform](https://api.minimax.chat/))
- Minimax Group ID for TTS functionality

### Configuration

Create or update your MCP configuration file:

   - For Windsurf: `~/.codeium/windsurf/mcp_config.json`
   - For Cursor: `~/.cursor/config/mcp_config.json`

   Both editors use the same configuration format:

```json
{
  "mcpServers": {
    "minimax-mcp-tools": {
      "command": "npx",
      "args": [
        "minimax-mcp-tools"
      ],
      "env": {
        "MINIMAX_API_KEY": "your-minimax-api-key",
        "MINIMAX_GROUP_ID": "your-minimax-group-id"
      }
    }
  }
}
```

## MCP Interface

### Image Generation

Generate images based on text prompts:

```javascript
// Example parameters for image generation
{
  "prompt": "A mountain landscape at sunset",
  "aspectRatio": "16:9",
  "n": 1,
  "outputFile": "/absolute/path/to/image.jpg"
}
```

Parameters:
- `prompt` (required): Description of the image to generate
- `outputFile` (required): Absolute path to save the generated image file
- `aspectRatio` (optional): Aspect ratio of the image (default: "1:1", options: "1:1", "16:9", "4:3", "3:2", "2:3", "3:4", "9:16", "21:9")
- `n` (optional): Number of images to generate (default: 1, range: 1-9)

### Text-to-Speech

Convert text to speech with various customization options:

```javascript
// Example parameters for text-to-speech
{
  "text": "Hello, this is a test of the text-to-speech functionality.",
  "model": "speech-01-turbo",
  "voiceId": "female-shaonv",
  "speed": 1.0,
  "volume": 1.0,
  "pitch": 0,
  "emotion": "happy",
  "format": "mp3",
  "outputFile": "/absolute/path/to/audio.mp3",
  "subtitleEnable": true
}
```

#### Basic Parameters:
- `text` (required): Text to convert to speech (max 10,000 characters)
- `outputFile` (required): Absolute path to save the generated audio file
- `model` (optional): Model version to use (default: "speech-01-turbo", options: "speech-01-turbo", "speech-01-240228", "speech-01-turbo-240228", "speech-01-hd")
- `voiceId` (optional): Voice ID to use (default: "male-qn-qingse")
- `speed` (optional): Speech speed (default: 1.0, range: 0.5-2.0)
- `volume` (optional): Speech volume (default: 1.0, range: 0.1-10.0)
- `pitch` (optional): Speech pitch (default: 0, range: -12 to 12)
- `emotion` (optional): Emotion of the speech (default: "neutral", options: "happy", "sad", "angry", "fearful", "disgusted", "surprised", "neutral")
- `timberWeights` (optional): Voice mixing settings, allows mixing up to 4 different voices with weights
  ```javascript
  "timberWeights": [
    { "voice_id": "male-qn-qingse", "weight": 70 },
    { "voice_id": "female-shaonv", "weight": 30 }
  ]
  ```

#### Audio Settings:
- `format` (optional): Audio format (default: "mp3", options: "mp3", "pcm", "flac", "wav")
- `sampleRate` (optional): Sample rate in Hz (default: 32000, options: 8000, 16000, 22050, 24000, 32000, 44100)
- `bitrate` (optional): Bitrate for MP3 format (default: 128000, options: 32000, 64000, 128000, 256000)
- `channel` (optional): Number of audio channels (default: 1, options: 1=mono, 2=stereo)

#### Advanced Features:
- `latexRead` (optional): Whether to read LaTeX formulas (default: false)
- `pronunciationDict` (optional): List of pronunciation replacements
  ```javascript
  "pronunciationDict": ["处理/(chu3)(li3)", "危险/dangerous"]
  ```
- `stream` (optional): Whether to use streaming mode (default: false)
- `languageBoost` (optional): Enhance recognition of specific languages
  - Options: "Chinese", "Chinese,Yue", "English", "Arabic", "Russian", "Spanish", "French", "Portuguese", "German", "Turkish", "Dutch", "Ukrainian", "Vietnamese", "Indonesian", "Japanese", "Italian", "Korean", "auto"
- `subtitleEnable` (optional): Whether to enable subtitle generation (default: false)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgements

- [Minimax API](https://platform.minimaxi.com/) for providing the AI models
- [Model Context Protocol](https://github.com/modelcontextprotocol/) for the MCP specification
