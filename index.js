#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { generateImage } from "./minimax-api.js";
import { generateSpeech } from "./minimax-tts-api.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a new MCP server
const server = new McpServer({
  name: "minimax-mcp-tools",
  version: "1.0.0"
});

// Define an image generation tool using Minimax API
server.tool(
  "generate_image",
  { 
    prompt: z.string().describe("Description of the image to generate"),
    aspectRatio: z.enum(["1:1", "16:9", "4:3", "3:2", "2:3", "3:4", "9:16", "21:9"]).optional().describe("Aspect ratio of the image"),
    outputFile: z.string().optional().describe("Absolute path to save the generated image file"),
    n: z.number().min(1).max(9).optional().describe("Number of images to generate (1-9)")
  },
  async ({ prompt, aspectRatio, outputFile, n }) => {
    // Get API key from environment variable
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      return {
        content: [{ 
          type: "text", 
          text: "Error: MINIMAX_API_KEY environment variable is not set. Please set it in the MCP server configuration." 
        }]
      };
    }

    // Set default output directory if not provided
    const outputDirectory = outputFile ? path.dirname(outputFile) : 'generated-images';
    
    try {
      // Call the Minimax API to generate the image
      const result = await generateImage(prompt, apiKey, {
        aspectRatio: aspectRatio || "1:1",
        n: n || 1
      }, outputDirectory, outputFile);

      if (!result.success) {
        return {
          content: [{ 
            type: "text", 
            text: `Error generating image: ${result.error}` 
          }]
        };
      }

      // Prepare the response with image information
      const imageDetails = result.images.map(img => {
        const absolutePath = outputFile ? outputFile : img.localPath;
        return `- Image saved to: ${absolutePath}\n  URL: ${img.url}`;
      }).join('\n');

      return {
        content: [{ 
          type: "text", 
          text: `Successfully generated ${result.images.length} image(s):\n${imageDetails}` 
        }]
      };
    } catch (error) {
      console.error('Error in generate_image tool:', error);
      return {
        content: [{ 
          type: "text", 
          text: `Error generating image: ${error.message}` 
        }]
      };
    }
  }
);

// Voice ID descriptions for better user experience
const voiceIdDescription = `Voice ID to use. Options include:
- Male voices: male-qn-qingse (青涩青年), male-qn-jingying (精英青年), male-qn-badao (霸道青年), male-qn-daxuesheng (青年大学生)
- Female voices: female-shaonv (少女), female-yujie (御姐), female-chengshu (成熟女性), female-tianmei (甜美女性)
- Presenters: presenter_male (男性主持人), presenter_female (女性主持人)
- Audiobooks: audiobook_male_1 (男性有声书1), audiobook_male_2 (男性有声书2), audiobook_female_1 (女性有声书1), audiobook_female_2 (女性有声书2)
- Beta voices: male-qn-qingse-jingpin (青涩青年-beta), female-shaonv-jingpin (少女音色-beta)
- Character voices: clever_boy (聪明男童), cute_boy (可爱男童), lovely_girl (萌萌女童), cartoon_pig (卡通猪小琪), 
  bingjiao_didi (病娇弟弟), junlang_nanyou (俊朗男友), chunzhen_xuedi (纯真学弟), lengdan_xiongzhang (冷淡学长),
  badao_shaoye (霸道少爷), tianxin_xiaoling (甜心小玲), qiaopi_mengmei (俏皮萌妹), wumei_yujie (妩媚御姐),
  diadia_xuemei (嗲嗲学妹), danya_xuejie (淡雅学姐)
- Western characters: Santa_Claus, Grinch, Rudolph, Arnold, Charming_Santa, Charming_Lady, Sweet_Girl, Cute_Elf, Attractive_Girl, Serene_Woman`;

// Define a text-to-speech tool using Minimax API
server.tool(
  "generate_speech",
  { 
    text: z.string().describe("Text to convert to speech"),
    model: z.enum(["speech-01-turbo", "speech-01-240228", "speech-01-turbo-240228", "speech-01-hd"]).optional().describe("Model version to use for speech generation"),
    voiceId: z.string().optional().describe(voiceIdDescription),
    speed: z.number().min(0.5).max(2).optional().describe("Speech speed (0.5-2.0)"),
    volume: z.number().min(0.1).max(10).optional().describe("Speech volume (0.1-10.0)"),
    pitch: z.number().min(-12).max(12).optional().describe("Speech pitch (-12 to 12)"),
    emotion: z.enum(["happy", "sad", "angry", "fearful", "disgusted", "surprised", "neutral"]).optional().describe("Emotion of the speech"),
    format: z.enum(["mp3", "pcm", "flac", "wav"]).optional().describe("Audio format"),
    outputFile: z.string().optional().describe("Absolute path to save the generated audio file"),
    sampleRate: z.enum([8000, 16000, 22050, 24000, 32000, 44100]).optional().describe("Sample rate of the generated audio"),
    bitrate: z.enum([32000, 64000, 128000, 256000]).optional().describe("Bitrate of the generated audio (for MP3 only)"),
    channel: z.enum([1, 2]).optional().describe("Number of audio channels (1=mono, 2=stereo)"),
    latexRead: z.boolean().optional().describe("Whether to read LaTeX formulas"),
    pronunciationDict: z.array(z.string()).optional().describe("List of pronunciation replacements"),
    timberWeights: z.array(
      z.object({
        voice_id: z.string(),
        weight: z.number().min(1).max(100)
      })
    ).optional().describe("Voice timber weights for voice mixing"),
    stream: z.boolean().optional().describe("Whether to use streaming mode"),
    languageBoost: z.enum([
      "Chinese", "Chinese,Yue", "English", "Arabic", "Russian", "Spanish", 
      "French", "Portuguese", "German", "Turkish", "Dutch", "Ukrainian", 
      "Vietnamese", "Indonesian", "Japanese", "Italian", "Korean", "auto"
    ]).optional().describe("Enhance recognition of specific languages"),
    subtitleEnable: z.boolean().optional().describe("Whether to enable subtitle generation")
  },
  async ({ 
    text, model, voiceId, speed, volume, pitch, emotion, format, outputFile,
    sampleRate, bitrate, channel, latexRead, pronunciationDict, timberWeights,
    stream, languageBoost, subtitleEnable
  }) => {
    // Get API key and group ID from environment variables
    const apiKey = process.env.MINIMAX_API_KEY;
    const groupId = process.env.MINIMAX_GROUP_ID;
    
    if (!apiKey) {
      return {
        content: [{ 
          type: "text", 
          text: "Error: MINIMAX_API_KEY environment variable is not set. Please set it in the MCP server configuration." 
        }]
      };
    }

    if (!groupId) {
      return {
        content: [{ 
          type: "text", 
          text: "Error: MINIMAX_GROUP_ID environment variable is not set. Please set it in the MCP server configuration." 
        }]
      };
    }

    // Set default output directory if not provided
    const outputDirectory = outputFile ? path.dirname(outputFile) : 'generated-audio';
    
    try {
      // Call the Minimax API to generate speech
      const result = await generateSpeech(text, apiKey, groupId, {
        model,
        voiceId: voiceId || "male-qn-qingse",
        speed: speed || 1.0,
        volume: volume || 1.0,
        pitch: pitch || 0,
        emotion: emotion || "neutral",
        format: format || "mp3",
        sampleRate,
        bitrate,
        channel,
        latexRead,
        pronunciationDict,
        timberWeights,
        stream,
        languageBoost,
        subtitleEnable
      }, outputDirectory, outputFile);

      if (!result.success) {
        return {
          content: [{ 
            type: "text", 
            text: `Error generating speech: ${result.error}` 
          }]
        };
      }

      // Prepare the response with audio information
      const audioInfo = result.audioInfo;
      const durationSeconds = audioInfo.length / 1000; // Convert milliseconds to seconds
      const fileSizeKB = Math.round(audioInfo.size / 1024); // Convert bytes to KB

      let responseText = `Successfully generated speech:\n- Audio saved to: ${outputFile || audioInfo.localPath}\n- Format: ${audioInfo.format}\n- Duration: ${durationSeconds.toFixed(2)} seconds\n- File size: ${fileSizeKB} KB`;
      
      // Add subtitle information if available
      if (audioInfo.subtitlePath) {
        responseText += `\n- Subtitle file: ${audioInfo.subtitlePath}`;
      }

      return {
        content: [{ 
          type: "text", 
          text: responseText
        }]
      };
    } catch (error) {
      console.error('Error in generate_speech tool:', error);
      return {
        content: [{ 
          type: "text", 
          text: `Error generating speech: ${error.message}` 
        }]
      };
    }
  }
);

// Log to stderr for debugging
console.error("Minimax MCP Tools Server starting...");

// Set up stdio transport and connect
const transport = new StdioServerTransport();
await server.connect(transport);

console.error("MCP Server connected and ready to receive commands");
