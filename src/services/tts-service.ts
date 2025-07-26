import { MinimaxBaseClient } from '../core/base-client.ts';
import { API_CONFIG, DEFAULTS, MODELS, VOICES, type TTSModel, type VoiceId } from '../config/constants.ts';
import { FileHandler } from '../utils/file-handler.ts';
import { ErrorHandler } from '../utils/error-handler.ts';
import { type TextToSpeechParams } from '../config/schemas.ts';

interface TTSPayload {
  model: string;
  text: string;
  voice_setting: {
    voice_id: string;
    speed: number;
    vol: number;
    pitch: number;
    emotion: string;
  };
  audio_setting: {
    sample_rate: number;
    bitrate: number;
    format: string;
    channel: number;
  };
  language_boost?: string;
  voice_modify?: {
    pitch?: number;
    intensity?: number;
    timbre?: number;
    sound_effects?: string;
  };
}

interface TTSResponse {
  data?: {
    audio?: string;
    duration?: number;
    subtitle_url?: string;
  };
}

interface TTSResult {
  audioFile: string;
  voiceUsed: string;
  model: string;
  duration: number | null;
  format: string;
  sampleRate: number;
  bitrate: number;
  subtitleFile?: string;
  warnings?: string[];
}


export class TextToSpeechService extends MinimaxBaseClient {
  constructor(options: { baseURL?: string; timeout?: number } = {}) {
    super(options);
  }

  async generateSpeech(params: TextToSpeechParams): Promise<TTSResult> {
    try {
      // Build API payload (MCP handles validation)
      const payload = this.buildPayload(params);
      
      // Make API request
      const response = await this.post(API_CONFIG.ENDPOINTS.TEXT_TO_SPEECH, payload) as TTSResponse;
      
      // Process response
      return await this.processTTSResponse(response, params);
      
    } catch (error: any) {
      const processedError = ErrorHandler.handleAPIError(error);
      ErrorHandler.logError(processedError, { service: 'tts', params });
      
      // Throw the error so task manager can properly mark it as failed
      throw processedError;
    }
  }

  private buildPayload(params: TextToSpeechParams): TTSPayload {
    const ttsDefaults = DEFAULTS.TTS as any;
    // Map highQuality parameter to appropriate model
    const model = (params as any).highQuality ? 'speech-02-hd' : 'speech-02-turbo';
    const payload: TTSPayload = {
      model: model,
      text: params.text,
      voice_setting: {
        voice_id: params.voiceId || ttsDefaults.voiceId,
        speed: params.speed || ttsDefaults.speed,
        vol: params.volume || ttsDefaults.volume,
        pitch: params.pitch || ttsDefaults.pitch,
        emotion: params.emotion || ttsDefaults.emotion
      },
      audio_setting: {
        sample_rate: parseInt(params.sampleRate || ttsDefaults.sampleRate),
        bitrate: parseInt(params.bitrate || ttsDefaults.bitrate),
        format: params.format || ttsDefaults.format,
        channel: ttsDefaults.channel
      }
    };

    // Add optional parameters
    if (params.languageBoost) {
      payload.language_boost = params.languageBoost;
    }
    
    // Add voice modify parameters if present
    if (params.intensity !== undefined || params.timbre !== undefined || params.sound_effects !== undefined) {
      payload.voice_modify = {};
      
      if (params.intensity !== undefined) {
        payload.voice_modify.intensity = params.intensity;
      }
      
      if (params.timbre !== undefined) {
        payload.voice_modify.timbre = params.timbre;
      }
      
      if (params.sound_effects !== undefined) {
        payload.voice_modify.sound_effects = params.sound_effects;
      }
    }

    // Voice mixing feature removed for simplicity

    // Filter out undefined values
    return this.cleanPayload(payload) as TTSPayload;
  }

  private cleanPayload(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanPayload(item)).filter(item => item !== undefined);
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;

      if (typeof value === 'object' && value !== null) {
        const cleanedValue = this.cleanPayload(value);
        if (typeof cleanedValue === 'object' && !Array.isArray(cleanedValue) && Object.keys(cleanedValue).length === 0) {
          continue;
        }
        result[key] = cleanedValue;
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private async processTTSResponse(response: TTSResponse, params: TextToSpeechParams): Promise<TTSResult> {
    const audioHex = response.data?.audio;
    
    if (!audioHex) {
      throw new Error('No audio data received from API');
    }

    // Convert hex to bytes and save
    const audioBytes = Buffer.from(audioHex, 'hex');
    await FileHandler.writeFile(params.outputFile, audioBytes);

    const ttsDefaults = DEFAULTS.TTS as any;
    const result: TTSResult = {
      audioFile: params.outputFile,
      voiceUsed: params.voiceId || ttsDefaults.voiceId,
      model: (params as any).highQuality ? 'speech-02-hd' : 'speech-02-turbo',
      duration: response.data?.duration || null,
      format: params.format || ttsDefaults.format,
      sampleRate: parseInt(params.sampleRate || ttsDefaults.sampleRate),
      bitrate: parseInt(params.bitrate || ttsDefaults.bitrate)
    };

    // Subtitles feature removed for simplicity

    return result;
  }

  // Utility methods
  getSupportedModels(): string[] {
    return Object.keys(MODELS.TTS);
  }

  getSupportedVoices(): string[] {
    return Object.keys(VOICES);
  }

  getVoiceInfo(voiceId: string): { name: string; gender: 'male' | 'female' | 'other'; language: 'zh' | 'en' } | null {
    return VOICES[voiceId as VoiceId] || null;
  }

  getModelInfo(modelName: string): { name: string; description: string } | null {
    return MODELS.TTS[modelName as TTSModel] || null;
  }


  validateVoiceParameters(params: TextToSpeechParams): string[] {
    const ttsDefaults = DEFAULTS.TTS as any;
    const voice = this.getVoiceInfo(params.voiceId || ttsDefaults.voiceId);
    const model = (params as any).highQuality ? 'speech-02-hd' : 'speech-02-turbo';
    
    const issues: string[] = [];
    
    if (!voice && params.voiceId) {
      issues.push(`Unknown voice ID: ${params.voiceId}`);
    }
    
    // Check emotion compatibility (both speech-02 models support emotions)
    if (params.emotion && params.emotion !== 'neutral') {
      const emotionSupportedModels = ['speech-02-hd', 'speech-02-turbo', 'speech-01-hd', 'speech-01-turbo'];
      if (!emotionSupportedModels.includes(model)) {
        issues.push(`Emotion parameter not supported by model ${model}`);
      }
    }
    
    return issues;
  }

}