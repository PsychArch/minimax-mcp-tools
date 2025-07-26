# Minimax MCP 工具

Minimax AI 集成的模型上下文协议(MCP)服务器，提供异步图像生成和文本转语音功能，具备高级速率限制和错误处理。

[English](README.md) | 简体中文

## 快速开始

### 1. 前提条件
- Node.js 18+
- 从 [platform.minimaxi.com](https://platform.minimaxi.com/) 获取 Minimax API 密钥

### 2. 设置
```bash
# 设置你的 API 密钥
export MINIMAX_API_KEY="your_api_key_here"

# 安装并运行
npm install
npm start
```

### 3. MCP 配置
添加到你的 MCP 设置中：
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

## 工具

### `submit_image_generation`
异步图像生成，具有速率限制（10 RPM）。

**必需参数：**
- `prompt`: 文本描述（最多1500字符）
- `outputFile`: 图像文件的绝对路径

**可选参数：**
- `aspectRatio`: "1:1", "16:9", "4:3" 等（默认："1:1"）
- `n`: 图像数量 1-9（默认：1）
- `model`: "image-01" 或 "image-01-live"（默认："image-01"）
- `subjectReference`: 参考图像 URL 或本地路径
- `customSize`: `{width, height}`（512-2048，必须是8的倍数）

### `submit_speech_generation`
异步文本转语音，具有速率限制（20 RPM）。

**必需参数：**
- `text`: 要转换的文本（最多10000字符）
- `outputFile`: 音频文件的绝对路径

**可选参数：**
- `model`: "speech-02-hd" 或 "speech-02-turbo"（默认："speech-02-hd"）
- `voiceId`: 声音标识符（默认："female-shaonv"）
- `speed`: 0.5-2.0（默认：1.0）
- `emotion`: "neutral", "happy", "sad"（默认："neutral"）
- `format`: "mp3", "wav", "flac", "pcm"（默认："mp3"）
- `volume`: 0.1-10.0（默认：1.0）
- `pitch`: -12 到 12（默认：0）

### `task_barrier`
等待所有提交的任务完成并获取结果。

## 使用示例

```javascript
// 提交多个任务
await submit_image_generation({
  prompt: "宁静的山景",
  outputFile: "/tmp/mountain.jpg",
  aspectRatio: "16:9"
});

await submit_speech_generation({
  text: "你好世界，这是一个测试",
  outputFile: "/tmp/speech.mp3",
  emotion: "happy"
});

// 等待完成并获取结果
await task_barrier();
```

## 功能特点

✅ **无需群组ID** - 仅需 API 密钥  
✅ **异步任务管理** - 提交多个任务，使用屏障等待  
✅ **自适应速率限制** - 根据 API 响应自动调整  
✅ **全面错误处理** - 详细错误信息和恢复机制  
✅ **生产就绪** - 健康检查、指标监控、优雅关闭  

## 架构

- **清晰分离**：配置、服务、工具类合理分离
- **速率限制**：令牌桶算法，支持突发容量和自适应调整
- **错误恢复**：指数退避和熔断机制
- **参数验证**：基于 Zod 的模式验证，详细错误信息
- **监控**：内置健康检查和性能指标

## 环境变量

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `MINIMAX_API_KEY` | *必需* | 你的 Minimax API 密钥 |
| `LOG_LEVEL` | `error` | 日志级别：`error` 或 `debug` |
| `MAX_CONCURRENCY` | `5` | 最大并发任务数 |
| `RETRY_ATTEMPTS` | `3` | 重试次数 |

## 许可证

MIT