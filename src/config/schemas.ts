import { z } from 'zod';
import { 
  CONSTRAINTS, 
  VOICES,
  type VoiceId,
  type AspectRatio,
  type StyleType,
  type Emotion,
  type AudioFormat,
  type SampleRate,
  type Bitrate,
  type SoundEffect
} from './constants.js';

// Base schemas
const filePathSchema = z.string().min(1, 'File path is required');
const positiveIntSchema = z.number().int().positive();

// Helper functions for generating descriptions
const getSoundEffectsDescription = () => {
  const descriptions = {
    'spacious_echo': 'spacious_echo (空旷回音)',
    'auditorium_echo': 'auditorium_echo (礼堂广播)',
    'lofi_telephone': 'lofi_telephone (电话失真)',
    'robotic': 'robotic (机械音)'
  };
  return `Sound effects. Options: ${CONSTRAINTS.TTS.SOUND_EFFECTS.map(effect => descriptions[effect] || effect).join(', ')}. Only one sound effect can be used per request`;
};

// Image generation schema
export const imageGenerationSchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt is required')
    .max(CONSTRAINTS.IMAGE.PROMPT_MAX_LENGTH, `Prompt must not exceed ${CONSTRAINTS.IMAGE.PROMPT_MAX_LENGTH} characters`),
  
  outputFile: filePathSchema.describe('Absolute path for generated image'),
  
  
  aspectRatio: z.enum(CONSTRAINTS.IMAGE.ASPECT_RATIOS as readonly [AspectRatio, ...AspectRatio[]])
    .default('1:1' as AspectRatio)
    .describe(`Aspect ratio for the image. Options: ${CONSTRAINTS.IMAGE.ASPECT_RATIOS.join(', ')}`),
    
  customSize: z.object({
    width: z.number()
      .min(CONSTRAINTS.IMAGE.MIN_DIMENSION)
      .max(CONSTRAINTS.IMAGE.MAX_DIMENSION)
      .multipleOf(CONSTRAINTS.IMAGE.DIMENSION_STEP),
    height: z.number()
      .min(CONSTRAINTS.IMAGE.MIN_DIMENSION)
      .max(CONSTRAINTS.IMAGE.MAX_DIMENSION)
      .multipleOf(CONSTRAINTS.IMAGE.DIMENSION_STEP)
  }).optional().describe('Custom image dimensions (width x height in pixels). Range: 512-2048, must be multiples of 8. Total resolution should stay under 2M pixels. Only supported with image-01 model (cannot be used with style parameter). When both customSize and aspectRatio are set, aspectRatio takes precedence'),
  
    
  seed: positiveIntSchema.optional().describe('Random seed for reproducible results'),
  
  subjectReference: z.string().optional().describe('File path to a portrait image for maintaining facial characteristics in generated images. Only supported with image-01 model (cannot be used with style parameter). Provide a clear frontal face photo for best results. Supports local file paths and URLs. Max 10MB, formats: jpg, jpeg, png'),
  
  style: z.object({
    style_type: z.enum(CONSTRAINTS.IMAGE.STYLE_TYPES as readonly [StyleType, ...StyleType[]])
      .describe(`Art style type. Options: ${CONSTRAINTS.IMAGE.STYLE_TYPES.join(', ')}`),
    style_weight: z.number()
      .min(CONSTRAINTS.IMAGE.STYLE_WEIGHT_MIN, 'Style weight must be greater than 0')
      .max(CONSTRAINTS.IMAGE.STYLE_WEIGHT_MAX, 'Style weight must not exceed 1')
      .default(0.8)
      .describe('Style control weight (0-1]. Higher values apply stronger style effects. Default: 0.8')
  }).optional().describe('Art style control settings. Uses image-01-live model which does not support customSize or subjectReference parameters. Cannot be combined with customSize or subjectReference'),
  
});

// Text-to-speech schema
export const textToSpeechSchema = z.object({
  text: z.string()
    .min(1, 'Text is required')
    .max(CONSTRAINTS.TTS.TEXT_MAX_LENGTH, `Text to convert to speech. Max ${CONSTRAINTS.TTS.TEXT_MAX_LENGTH} characters. Use newlines for paragraph breaks. For custom pauses, insert <#x#> where x is seconds (0.01-99.99, max 2 decimals). Pause markers must be between pronounceable text and cannot be consecutive`),
    
  outputFile: filePathSchema.describe('Absolute path for audio file'),
  
  highQuality: z.boolean()
    .default(false)
    .describe('Use high-quality model (speech-02-hd) for audiobooks/premium content. Default: false (uses faster speech-02-turbo)'),
    
  voiceId: z.enum(Object.keys(VOICES) as [VoiceId, ...VoiceId[]])
    .default('female-shaonv' as VoiceId)
    .describe(`Voice ID for speech generation. Available voices: ${Object.keys(VOICES).map(id => `${id} (${VOICES[id as VoiceId]?.name || id})`).join(', ')}`),
    
  speed: z.number()
    .min(CONSTRAINTS.TTS.SPEED_MIN)
    .max(CONSTRAINTS.TTS.SPEED_MAX)
    .default(1.0)
    .describe(`Speech speed multiplier (${CONSTRAINTS.TTS.SPEED_MIN}-${CONSTRAINTS.TTS.SPEED_MAX}). Higher values = faster speech`),
    
  volume: z.number()
    .min(CONSTRAINTS.TTS.VOLUME_MIN)
    .max(CONSTRAINTS.TTS.VOLUME_MAX)
    .default(1.0)
    .describe(`Audio volume level (${CONSTRAINTS.TTS.VOLUME_MIN}-${CONSTRAINTS.TTS.VOLUME_MAX}). Higher values = louder audio`),
    
  pitch: z.number()
    .min(CONSTRAINTS.TTS.PITCH_MIN)
    .max(CONSTRAINTS.TTS.PITCH_MAX)
    .default(0)
    .describe(`Pitch adjustment in semitones (${CONSTRAINTS.TTS.PITCH_MIN} to ${CONSTRAINTS.TTS.PITCH_MAX}). Negative = lower pitch, Positive = higher pitch`),
    
  emotion: z.enum(CONSTRAINTS.TTS.EMOTIONS as readonly [Emotion, ...Emotion[]])
    .default('neutral' as Emotion)
    .describe(`Emotional tone of the speech. Options: ${CONSTRAINTS.TTS.EMOTIONS.join(', ')}`),
    
  format: z.enum(CONSTRAINTS.TTS.FORMATS as readonly [AudioFormat, ...AudioFormat[]])
    .default('mp3' as AudioFormat)
    .describe(`Output audio format. Options: ${CONSTRAINTS.TTS.FORMATS.join(', ')}`),
    
  sampleRate: z.enum(CONSTRAINTS.TTS.SAMPLE_RATES as readonly [SampleRate, ...SampleRate[]])
    .default("32000" as SampleRate)
    .describe(`Audio sample rate in Hz. Options: ${CONSTRAINTS.TTS.SAMPLE_RATES.join(', ')}`),
    
  bitrate: z.enum(CONSTRAINTS.TTS.BITRATES as readonly [Bitrate, ...Bitrate[]])
    .default("128000" as Bitrate)  
    .describe(`Audio bitrate in bps. Options: ${CONSTRAINTS.TTS.BITRATES.join(', ')}`),
    
  languageBoost: z.string().default('auto').describe('Enhance recognition for specific languages/dialects. Options: Chinese, Chinese,Yue, English, Arabic, Russian, Spanish, French, Portuguese, German, Turkish, Dutch, Ukrainian, Vietnamese, Indonesian, Japanese, Italian, Korean, Thai, Polish, Romanian, Greek, Czech, Finnish, Hindi, Bulgarian, Danish, Hebrew, Malay, Persian, Slovak, Swedish, Croatian, Filipino, Hungarian, Norwegian, Slovenian, Catalan, Nynorsk, Tamil, Afrikaans, auto. Use "auto" for automatic detection'),
  
  intensity: z.number()
    .int()
    .min(CONSTRAINTS.TTS.VOICE_MODIFY_INTENSITY_MIN)
    .max(CONSTRAINTS.TTS.VOICE_MODIFY_INTENSITY_MAX)
    .optional()
    .describe('Voice intensity adjustment (-100 to 100). Values closer to -100 make voice more robust, closer to 100 make voice softer'),
    
  timbre: z.number()
    .int()
    .min(CONSTRAINTS.TTS.VOICE_MODIFY_TIMBRE_MIN)
    .max(CONSTRAINTS.TTS.VOICE_MODIFY_TIMBRE_MAX)
    .optional()
    .describe('Voice timbre adjustment (-100 to 100). Values closer to -100 make voice more mellow, closer to 100 make voice more crisp'),
    
  sound_effects: z.enum(CONSTRAINTS.TTS.SOUND_EFFECTS as readonly [SoundEffect, ...SoundEffect[]])
    .optional()
    .describe(getSoundEffectsDescription())
});

// Task barrier schema
export const taskBarrierSchema = z.object({});

// Type definitions for parsed schemas
export type ImageGenerationParams = z.infer<typeof imageGenerationSchema>;
export type TextToSpeechParams = z.infer<typeof textToSpeechSchema>;
export type TaskBarrierParams = z.infer<typeof taskBarrierSchema>;

// MCP Tool Schemas (for registerTool API)
export const imageGenerationToolSchema = {
  type: "object",
  properties: {
      prompt: {
        type: "string",
        description: `Image generation prompt (max ${CONSTRAINTS.IMAGE.PROMPT_MAX_LENGTH} characters)`,
        maxLength: CONSTRAINTS.IMAGE.PROMPT_MAX_LENGTH
      },
      outputFile: {
        type: "string",
        description: "Absolute path for generated image file"
      },
      aspectRatio: {
        type: "string",
        enum: [...CONSTRAINTS.IMAGE.ASPECT_RATIOS],
        default: "1:1",
        description: `Aspect ratio for the image. Options: ${CONSTRAINTS.IMAGE.ASPECT_RATIOS.join(', ')}`
      },
      customSize: {
        type: "object",
        properties: {
          width: { type: "number", minimum: CONSTRAINTS.IMAGE.MIN_DIMENSION, maximum: CONSTRAINTS.IMAGE.MAX_DIMENSION, multipleOf: CONSTRAINTS.IMAGE.DIMENSION_STEP },
          height: { type: "number", minimum: CONSTRAINTS.IMAGE.MIN_DIMENSION, maximum: CONSTRAINTS.IMAGE.MAX_DIMENSION, multipleOf: CONSTRAINTS.IMAGE.DIMENSION_STEP }
        },
        required: ["width", "height"],
        description: "Custom image dimensions (width x height in pixels). Range: 512-2048, must be multiples of 8. Total resolution should stay under 2M pixels. Only supported with image-01 model (cannot be used with style parameter). When both customSize and aspectRatio are set, aspectRatio takes precedence"
      },
      seed: {
        type: "number",
        description: "Random seed for reproducible results"
      },
      subjectReference: {
        type: "string",
        description: "File path to a portrait image for maintaining facial characteristics in generated images. Only supported with image-01 model (cannot be used with style parameter). Provide a clear frontal face photo for best results. Supports local file paths and URLs. Max 10MB, formats: jpg, jpeg, png"
      },
      style: {
        type: "object",
        properties: {
          style_type: { 
            type: "string", 
            enum: [...CONSTRAINTS.IMAGE.STYLE_TYPES], 
            description: `Art style type. Options: ${CONSTRAINTS.IMAGE.STYLE_TYPES.join(', ')}` 
          },
          style_weight: { 
            type: "number", 
            exclusiveMinimum: 0, 
            maximum: CONSTRAINTS.IMAGE.STYLE_WEIGHT_MAX, 
            default: 0.8, 
            description: "Style control weight (0-1]. Higher values apply stronger style effects. Default: 0.8" 
          }
        },
        required: ["style_type"],
        description: "Art style control settings. Uses image-01-live model which does not support customSize or subjectReference parameters. Cannot be combined with customSize or subjectReference"
      }
    },
  required: ["prompt", "outputFile"]
} as const;

export const textToSpeechToolSchema = {
  type: "object",
  properties: {
      text: {
        type: "string",
        description: `Text to convert to speech. Max ${CONSTRAINTS.TTS.TEXT_MAX_LENGTH} characters. Use newlines for paragraph breaks. For custom pauses, insert <#x#> where x is seconds (0.01-99.99, max 2 decimals). Pause markers must be between pronounceable text and cannot be consecutive`,
        maxLength: CONSTRAINTS.TTS.TEXT_MAX_LENGTH,
        minLength: 1
      },
      outputFile: {
        type: "string",
        description: "Absolute path for audio file"
      },
      highQuality: {
        type: "boolean",
        default: false,
        description: "Use high-quality model (speech-02-hd) for audiobooks/premium content. Default: false (uses faster speech-02-turbo)"
      },
      voiceId: {
        type: "string",
        enum: Object.keys(VOICES),
        default: "female-shaonv",
        description: `Voice ID for speech generation. Available voices: ${Object.keys(VOICES).map(id => `${id} (${VOICES[id as VoiceId]?.name || id})`).join(', ')}`
      },
      speed: {
        type: "number",
        minimum: CONSTRAINTS.TTS.SPEED_MIN,
        maximum: CONSTRAINTS.TTS.SPEED_MAX,
        default: 1.0,
        description: `Speech speed multiplier (${CONSTRAINTS.TTS.SPEED_MIN}-${CONSTRAINTS.TTS.SPEED_MAX}). Higher values = faster speech`
      },
      volume: {
        type: "number",
        minimum: CONSTRAINTS.TTS.VOLUME_MIN,
        maximum: CONSTRAINTS.TTS.VOLUME_MAX,
        default: 1.0,
        description: `Audio volume level (${CONSTRAINTS.TTS.VOLUME_MIN}-${CONSTRAINTS.TTS.VOLUME_MAX}). Higher values = louder audio`
      },
      pitch: {
        type: "number",
        minimum: CONSTRAINTS.TTS.PITCH_MIN,
        maximum: CONSTRAINTS.TTS.PITCH_MAX,
        default: 0,
        description: `Pitch adjustment in semitones (${CONSTRAINTS.TTS.PITCH_MIN} to ${CONSTRAINTS.TTS.PITCH_MAX}). Negative = lower pitch, Positive = higher pitch`
      },
      emotion: {
        type: "string",
        enum: [...CONSTRAINTS.TTS.EMOTIONS],
        default: "neutral",
        description: `Emotional tone of the speech. Options: ${CONSTRAINTS.TTS.EMOTIONS.join(', ')}`
      },
      format: {
        type: "string",
        enum: [...CONSTRAINTS.TTS.FORMATS],
        default: "mp3",
        description: `Output audio format. Options: ${CONSTRAINTS.TTS.FORMATS.join(', ')}`
      },
      sampleRate: {
        type: "string",
        enum: [...CONSTRAINTS.TTS.SAMPLE_RATES],
        default: "32000",
        description: `Audio sample rate in Hz. Options: ${CONSTRAINTS.TTS.SAMPLE_RATES.join(', ')}`
      },
      bitrate: {
        type: "string",
        enum: [...CONSTRAINTS.TTS.BITRATES],
        default: "128000",
        description: `Audio bitrate in bps. Options: ${CONSTRAINTS.TTS.BITRATES.join(', ')}`
      },
      languageBoost: {
        type: "string",
        default: "auto",
        description: "Enhance recognition for specific languages/dialects. Options: Chinese, Chinese,Yue, English, Arabic, Russian, Spanish, French, Portuguese, German, Turkish, Dutch, Ukrainian, Vietnamese, Indonesian, Japanese, Italian, Korean, Thai, Polish, Romanian, Greek, Czech, Finnish, Hindi, Bulgarian, Danish, Hebrew, Malay, Persian, Slovak, Swedish, Croatian, Filipino, Hungarian, Norwegian, Slovenian, Catalan, Nynorsk, Tamil, Afrikaans, auto. Use 'auto' for automatic detection"
      },
      intensity: {
        type: "number", 
        minimum: CONSTRAINTS.TTS.VOICE_MODIFY_INTENSITY_MIN,
        maximum: CONSTRAINTS.TTS.VOICE_MODIFY_INTENSITY_MAX,
        description: "Voice intensity adjustment (-100 to 100). Values closer to -100 make voice more robust, closer to 100 make voice softer"
      },
      timbre: {
        type: "number",
        minimum: CONSTRAINTS.TTS.VOICE_MODIFY_TIMBRE_MIN,
        maximum: CONSTRAINTS.TTS.VOICE_MODIFY_TIMBRE_MAX,
        description: "Voice timbre adjustment (-100 to 100). Values closer to -100 make voice more mellow, closer to 100 make voice more crisp"
      },
      sound_effects: {
        type: "string",
        enum: [...CONSTRAINTS.TTS.SOUND_EFFECTS],
        description: getSoundEffectsDescription()
      }
    },
  required: ["text", "outputFile"]
} as const;

export const taskBarrierToolSchema = {
  type: "object",
  properties: {}
} as const;

// Validation helper functions
export function validateImageParams(params: unknown): ImageGenerationParams {
  try {
    const parsed = imageGenerationSchema.parse(params);
    
    // Manual validation for incompatible parameter combinations
    const hasStyle = !!parsed.style;
    const hasCustomSize = !!parsed.customSize;
    const hasSubjectReference = !!parsed.subjectReference;
    
    if (hasStyle && hasCustomSize) {
      throw new Error('Style parameter (image-01-live model) cannot be combined with customSize (image-01 model feature)');
    }
    
    if (hasStyle && hasSubjectReference) {
      throw new Error('Style parameter (image-01-live model) cannot be combined with subjectReference (image-01 model feature)');
    }
    
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Validation failed: ${messages.join(', ')}`);
    }
    throw error;
  }
}

export function validateTTSParams(params: unknown): TextToSpeechParams {
  try {
    return textToSpeechSchema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Validation failed: ${messages.join(', ')}`);
    }
    throw error;
  }
}

export function validateTaskBarrierParams(params: unknown): TaskBarrierParams {
  try {
    return taskBarrierSchema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Validation failed: ${messages.join(', ')}`);
    }
    throw error;
  }
}