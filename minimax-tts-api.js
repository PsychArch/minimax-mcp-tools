import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate speech from text using Minimax API and save it to a file
 * @param {string} text - The text to convert to speech
 * @param {string} apiKey - The Minimax API key
 * @param {string} groupId - The Minimax group ID
 * @param {Object} options - Additional options for speech generation
 * @param {string} outputDir - Directory to save the generated audio
 * @param {string} outputFile - Absolute path to save the generated audio file
 * @returns {Promise<Object>} - Object containing the audio information
 */
export async function generateSpeech(text, apiKey, groupId, options = {}, outputDir, outputFile) {
  if (!apiKey) {
    throw new Error('Minimax API key is required');
  }

  if (!groupId) {
    throw new Error('Minimax group ID is required');
  }

  if (!outputFile) {
    throw new Error('Output file path is required');
  }

  const url = `https://api.minimax.chat/v1/t2a_v2?GroupId=${groupId}`;
  
  // Default voice settings
  const voiceSettings = {
    voice_id: options.voiceId || "male-qn-qingse",
    speed: options.speed || 1.0,
    vol: options.volume || 1.0,
    pitch: options.pitch || 0,
    emotion: options.emotion || "neutral"
  };
  
  // Add latex_read if provided
  if (options.latexRead !== undefined) {
    voiceSettings.latex_read = options.latexRead;
  }

  // Default audio settings
  const audioSettings = {
    sample_rate: options.sampleRate || 32000,
    bitrate: options.bitrate || 128000,
    format: options.format || "mp3",
    channel: options.channel || 1
  };

  // Build the request payload
  const payload = {
    model: options.model || "speech-02-hd",
    text: text,
    stream: options.stream || false,
    voice_setting: voiceSettings,
    audio_setting: audioSettings
  };

  // Add pronunciation dictionary if provided
  if (options.pronunciationDict && options.pronunciationDict.length > 0) {
    payload.pronunciation_dict = {
      tone: options.pronunciationDict
    };
  }

  // Add timber weights if provided
  if (options.timberWeights && options.timberWeights.length > 0) {
    payload.timber_weights = options.timberWeights;
    // Remove voice_id from voice_setting when using timber_weights
    delete payload.voice_setting.voice_id;
  }

  // Add language boost if provided
  if (options.languageBoost) {
    payload.language_boost = options.languageBoost;
  }

  // Add subtitle enable if provided
  if (options.subtitleEnable !== undefined) {
    payload.subtitle_enable = options.subtitleEnable;
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  try {
    console.error(`Generating speech for text: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (data.base_resp && data.base_resp.status_code !== 0) {
      throw new Error(`Minimax API error: ${data.base_resp.status_msg}`);
    }

    // Create output directory if it doesn't exist
    const absoluteOutputDir = path.dirname(outputFile);
    if (!fs.existsSync(absoluteOutputDir)) {
      fs.mkdirSync(absoluteOutputDir, { recursive: true });
    }

    // Save the audio file
    if (data.data && data.data.audio) {
      const timestamp = Date.now();
      const format = audioSettings.format;
      
      // Use outputFile path directly
      const filename = path.basename(outputFile);
      const filePath = outputFile;
      
      // Convert hex string to buffer and save
      const buffer = Buffer.from(data.data.audio, 'hex');
      fs.writeFileSync(filePath, buffer);
      
      // Save subtitle file if available
      let subtitlePath = null;
      if (data.subtitle_file) {
        const subtitleFilename = `subtitle_${timestamp}.json`;
        subtitlePath = path.join(absoluteOutputDir, subtitleFilename);
        
        // Download subtitle file
        try {
          const subtitleResponse = await fetch(data.subtitle_file);
          const subtitleData = await subtitleResponse.text();
          fs.writeFileSync(subtitlePath, subtitleData);
        } catch (error) {
          console.error('Error downloading subtitle file:', error);
        }
      }
      
      return {
        success: true,
        traceId: data.trace_id,
        audioInfo: {
          localPath: filePath,
          filename: filename,
          format: format,
          length: data.extra_info?.audio_length || 0, // in milliseconds
          size: data.extra_info?.audio_size || 0, // in bytes
          subtitlePath: subtitlePath
        },
        extraInfo: data.extra_info,
        rawResponse: data
      };
    } else {
      throw new Error('No audio data returned from the API');
    }
  } catch (error) {
    console.error('Error generating speech:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
