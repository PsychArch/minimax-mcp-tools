// Type definitions
export interface ModelConfig {
  name: string;
  description: string;
}

export interface VoiceConfig {
  name: string;
  gender: 'male' | 'female' | 'other';
  language: 'zh' | 'en';
}

export interface RateLimit {
  rpm: number;
  burst: number;
}

export interface ApiConfig {
  BASE_URL: string;
  ENDPOINTS: {
    IMAGE_GENERATION: string;
    TEXT_TO_SPEECH: string;
  };
  HEADERS: {
    'MM-API-Source': string;
  };
  TIMEOUT: number;
}

export interface ImageConstraints {
  PROMPT_MAX_LENGTH: number;
  MAX_IMAGES: number;
  MIN_DIMENSION: number;
  MAX_DIMENSION: number;
  DIMENSION_STEP: number;
  ASPECT_RATIOS: readonly string[];
  STYLE_TYPES: readonly string[];
  RESPONSE_FORMATS: readonly string[];
  SUBJECT_TYPES: readonly string[];
  STYLE_WEIGHT_MIN: number;
  STYLE_WEIGHT_MAX: number;
}

export interface TTSConstraints {
  TEXT_MAX_LENGTH: number;
  SPEED_MIN: number;
  SPEED_MAX: number;
  VOLUME_MIN: number;
  VOLUME_MAX: number;
  PITCH_MIN: number;
  PITCH_MAX: number;
  EMOTIONS: readonly string[];
  FORMATS: readonly string[];
  SAMPLE_RATES: readonly number[];
  BITRATES: readonly number[];
  VOICE_MODIFY_PITCH_MIN: number;
  VOICE_MODIFY_PITCH_MAX: number;
  VOICE_MODIFY_INTENSITY_MIN: number;
  VOICE_MODIFY_INTENSITY_MAX: number;
  VOICE_MODIFY_TIMBRE_MIN: number;
  VOICE_MODIFY_TIMBRE_MAX: number;
  SOUND_EFFECTS: readonly string[];
}

export interface ImageDefaults {
  model: string;
  aspectRatio: string;
  n: number;
  promptOptimizer: boolean;
  responseFormat: string;
  styleWeight: number;
}

export interface TTSDefaults {
  model: string;
  voiceId: string;
  speed: number;
  volume: number;
  pitch: number;
  emotion: string;
  format: string;
  sampleRate: number;
  bitrate: number;
  channel: number;
}

// API Configuration
export const API_CONFIG: ApiConfig = {
  BASE_URL: 'https://api.minimaxi.com/v1',
  ENDPOINTS: {
    IMAGE_GENERATION: '/image_generation',
    TEXT_TO_SPEECH: '/t2a_v2'
  },
  HEADERS: {
    'MM-API-Source': 'mcp-tools'
  },
  TIMEOUT: 30000
} as const;

// Rate Limiting Configuration
export const RATE_LIMITS: Record<'IMAGE' | 'TTS', RateLimit> = {
  IMAGE: { rpm: 10, burst: 3 },
  TTS: { rpm: 20, burst: 5 }
} as const;

// Model Configurations
export const MODELS: Record<'IMAGE' | 'TTS', Record<string, ModelConfig>> = {
  IMAGE: {
    'image-01': { name: 'image-01', description: 'Standard image generation' },
    'image-01-live': { name: 'image-01-live', description: 'Live image generation' }
  },
  TTS: {
    'speech-02-hd': { name: 'speech-02-hd', description: 'High quality TTS' },
    'speech-02-turbo': { name: 'speech-02-turbo', description: 'Fast TTS' }
  }
} as const;

// Voice Configurations
export const VOICES: Record<string, VoiceConfig> = {
  // Basic Chinese voices
  'male-qn-qingse': { name: '青涩青年音色', gender: 'male', language: 'zh' },
  'male-qn-jingying': { name: '精英青年音色', gender: 'male', language: 'zh' },
  'male-qn-badao': { name: '霸道青年音色', gender: 'male', language: 'zh' },
  'male-qn-daxuesheng': { name: '青年大学生音色', gender: 'male', language: 'zh' },
  'female-shaonv': { name: '少女音色', gender: 'female', language: 'zh' },
  'female-yujie': { name: '御姐音色', gender: 'female', language: 'zh' },
  'female-chengshu': { name: '成熟女性音色', gender: 'female', language: 'zh' },
  'female-tianmei': { name: '甜美女性音色', gender: 'female', language: 'zh' },
  
  // Professional voices
  'presenter_male': { name: '男性主持人', gender: 'male', language: 'zh' },
  'presenter_female': { name: '女性主持人', gender: 'female', language: 'zh' },
  'audiobook_male_1': { name: '男性有声书1', gender: 'male', language: 'zh' },
  'audiobook_male_2': { name: '男性有声书2', gender: 'male', language: 'zh' },
  'audiobook_female_1': { name: '女性有声书1', gender: 'female', language: 'zh' },
  'audiobook_female_2': { name: '女性有声书2', gender: 'female', language: 'zh' },
  
  // Beta voices
  'male-qn-qingse-jingpin': { name: '青涩青年音色-beta', gender: 'male', language: 'zh' },
  'male-qn-jingying-jingpin': { name: '精英青年音色-beta', gender: 'male', language: 'zh' },
  'male-qn-badao-jingpin': { name: '霸道青年音色-beta', gender: 'male', language: 'zh' },
  'male-qn-daxuesheng-jingpin': { name: '青年大学生音色-beta', gender: 'male', language: 'zh' },
  'female-shaonv-jingpin': { name: '少女音色-beta', gender: 'female', language: 'zh' },
  'female-yujie-jingpin': { name: '御姐音色-beta', gender: 'female', language: 'zh' },
  'female-chengshu-jingpin': { name: '成熟女性音色-beta', gender: 'female', language: 'zh' },
  'female-tianmei-jingpin': { name: '甜美女性音色-beta', gender: 'female', language: 'zh' },
  
  // Children voices
  'clever_boy': { name: '聪明男童', gender: 'male', language: 'zh' },
  'cute_boy': { name: '可爱男童', gender: 'male', language: 'zh' },
  'lovely_girl': { name: '萌萌女童', gender: 'female', language: 'zh' },
  'cartoon_pig': { name: '卡通猪小琪', gender: 'other', language: 'zh' },
  
  // Character voices
  'bingjiao_didi': { name: '病娇弟弟', gender: 'male', language: 'zh' },
  'junlang_nanyou': { name: '俊朗男友', gender: 'male', language: 'zh' },
  'chunzhen_xuedi': { name: '纯真学弟', gender: 'male', language: 'zh' },
  'lengdan_xiongzhang': { name: '冷淡学长', gender: 'male', language: 'zh' },
  'badao_shaoye': { name: '霸道少爷', gender: 'male', language: 'zh' },
  'tianxin_xiaoling': { name: '甜心小玲', gender: 'female', language: 'zh' },
  'qiaopi_mengmei': { name: '俏皮萌妹', gender: 'female', language: 'zh' },
  'wumei_yujie': { name: '妩媚御姐', gender: 'female', language: 'zh' },
  'diadia_xuemei': { name: '嗲嗲学妹', gender: 'female', language: 'zh' },
  'danya_xuejie': { name: '淡雅学姐', gender: 'female', language: 'zh' },
  
  // English voices
  'Santa_Claus': { name: 'Santa Claus', gender: 'male', language: 'en' },
  'Grinch': { name: 'Grinch', gender: 'male', language: 'en' },
  'Rudolph': { name: 'Rudolph', gender: 'other', language: 'en' },
  'Arnold': { name: 'Arnold', gender: 'male', language: 'en' },
  'Charming_Santa': { name: 'Charming Santa', gender: 'male', language: 'en' },
  'Charming_Lady': { name: 'Charming Lady', gender: 'female', language: 'en' },
  'Sweet_Girl': { name: 'Sweet Girl', gender: 'female', language: 'en' },
  'Cute_Elf': { name: 'Cute Elf', gender: 'other', language: 'en' },
  'Attractive_Girl': { name: 'Attractive Girl', gender: 'female', language: 'en' },
  'Serene_Woman': { name: 'Serene Woman', gender: 'female', language: 'en' }
} as const;

// Parameter Constraints
export const CONSTRAINTS = {
  IMAGE: {
    PROMPT_MAX_LENGTH: 1500,
    MAX_IMAGES: 9,
    MIN_DIMENSION: 512,
    MAX_DIMENSION: 2048,
    DIMENSION_STEP: 8,
    ASPECT_RATIOS: ["1:1", "16:9", "4:3", "3:2", "2:3", "3:4", "9:16", "21:9"] as const,
    STYLE_TYPES: ["漫画", "元气", "中世纪", "水彩"] as const,
    RESPONSE_FORMATS: ["url", "base64"] as const,
    SUBJECT_TYPES: ["character"] as const,
    STYLE_WEIGHT_MIN: 0.01,
    STYLE_WEIGHT_MAX: 1
  },
  TTS: {
    TEXT_MAX_LENGTH: 10000,
    SPEED_MIN: 0.5,
    SPEED_MAX: 2.0,
    VOLUME_MIN: 0.1,
    VOLUME_MAX: 10.0,
    PITCH_MIN: -12,
    PITCH_MAX: 12,
    EMOTIONS: ["neutral", "happy", "sad", "angry", "fearful", "disgusted", "surprised"] as const,
    FORMATS: ["mp3", "wav", "flac", "pcm"] as const,
    SAMPLE_RATES: ["8000", "16000", "22050", "24000", "32000", "44100"] as const,
    BITRATES: ["64000", "96000", "128000", "160000", "192000", "224000", "256000", "320000"] as const,
    VOICE_MODIFY_PITCH_MIN: -100,
    VOICE_MODIFY_PITCH_MAX: 100,
    VOICE_MODIFY_INTENSITY_MIN: -100,
    VOICE_MODIFY_INTENSITY_MAX: 100,
    VOICE_MODIFY_TIMBRE_MIN: -100,
    VOICE_MODIFY_TIMBRE_MAX: 100,
    SOUND_EFFECTS: ["spacious_echo", "auditorium_echo", "lofi_telephone", "robotic"] as const
  }
} as const;

// Default Values
export const DEFAULTS = {
  IMAGE: {
    model: 'image-01',
    aspectRatio: '1:1',
    n: 1,
    promptOptimizer: true,
    responseFormat: 'url',
    styleWeight: 0.8
  },
  TTS: {
    model: 'speech-02-hd',
    voiceId: 'female-shaonv',
    speed: 1.0,
    volume: 1.0,
    pitch: 0,
    emotion: 'neutral',
    format: 'mp3',
    sampleRate: "32000",
    bitrate: "128000",
    channel: 1
  }
} as const;

// Type exports for use in other modules
export type ImageModel = keyof typeof MODELS.IMAGE;
export type TTSModel = keyof typeof MODELS.TTS;
export type VoiceId = keyof typeof VOICES;
export type AspectRatio = typeof CONSTRAINTS.IMAGE.ASPECT_RATIOS[number];
export type StyleType = typeof CONSTRAINTS.IMAGE.STYLE_TYPES[number];
export type ResponseFormat = typeof CONSTRAINTS.IMAGE.RESPONSE_FORMATS[number];
export type SubjectType = typeof CONSTRAINTS.IMAGE.SUBJECT_TYPES[number];
export type Emotion = typeof CONSTRAINTS.TTS.EMOTIONS[number];
export type AudioFormat = typeof CONSTRAINTS.TTS.FORMATS[number];
export type SampleRate = typeof CONSTRAINTS.TTS.SAMPLE_RATES[number];
export type Bitrate = typeof CONSTRAINTS.TTS.BITRATES[number];
export type SoundEffect = typeof CONSTRAINTS.TTS.SOUND_EFFECTS[number];