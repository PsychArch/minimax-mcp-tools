import { MinimaxBaseClient } from '../core/base-client.ts';
import { API_CONFIG, DEFAULTS, MODELS, CONSTRAINTS, type ImageModel, type AspectRatio } from '../config/constants.ts';
import { FileHandler } from '../utils/file-handler.ts';
import { ErrorHandler, MinimaxError } from '../utils/error-handler.ts';
import { type ImageGenerationParams } from '../config/schemas.ts';

interface ImageGenerationPayload {
  model: string;
  prompt: string;
  n: number;
  prompt_optimizer: boolean;
  response_format: string;
  width?: number;
  height?: number;
  aspect_ratio?: string;
  seed?: number;
  subject_reference?: Array<{
    type: string;
    image_file: string;
  }>;
  style?: {
    style_type: string;
    style_weight: number;
  };
}

interface ImageGenerationResponse {
  data?: {
    image_urls?: string[];
    image_base64?: string[];
  };
}

interface ImageGenerationResult {
  success: boolean;
  files?: string[];
  count?: number;
  model?: string;
  prompt?: string;
  warnings?: string[];
  error?: string;
  code?: string;
}

export class ImageGenerationService extends MinimaxBaseClient {
  constructor(options: { baseURL?: string; timeout?: number } = {}) {
    super(options);
  }

  async generateImage(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    try {
      // Build API payload (MCP handles validation)
      const payload = this.buildPayload(params);
      
      // Make API request
      const response = await this.post(API_CONFIG.ENDPOINTS.IMAGE_GENERATION, payload) as ImageGenerationResponse;
      
      // Process response
      return await this.processImageResponse(response, params);
      
    } catch (error: any) {
      const processedError = ErrorHandler.handleAPIError(error);
      ErrorHandler.logError(processedError, { service: 'image', params });
      
      return {
        success: false,
        error: ErrorHandler.formatErrorForUser(processedError),
        code: processedError.code
      };
    }
  }

  private buildPayload(params: ImageGenerationParams): ImageGenerationPayload {
    const imageDefaults = DEFAULTS.IMAGE as any;
    
    // Choose model based on whether style is provided
    const model = params.style ? 'image-01-live' : 'image-01';
    
    const payload: ImageGenerationPayload = {
      model: model,
      prompt: params.prompt,
      n: 1,
      prompt_optimizer: true, // Always optimize prompts
      response_format: 'url' // Always use URL since we save to file
    };

    // Handle sizing parameters (conflict-free approach)
    if (params.customSize) {
      payload.width = params.customSize.width;
      payload.height = params.customSize.height;
    } else {
      payload.aspect_ratio = params.aspectRatio || imageDefaults.aspectRatio;
    }

    // Add optional parameters
    if (params.seed !== undefined) {
      payload.seed = params.seed;
    }

    // Model-specific parameter handling
    if (model === 'image-01') {
      // Add subject reference for image-01 model
      // MCP Server Bridge: Convert user-friendly file path to API format
      if (params.subjectReference) {
        // TODO: Convert file path/URL to base64 or ensure URL is accessible
        // For now, pass through assuming it's already in correct format
        payload.subject_reference = [{
          type: 'character',
          image_file: params.subjectReference
        }];
      }
    } else if (model === 'image-01-live') {
      // Add style settings for image-01-live model
      if (params.style) {
        payload.style = {
          style_type: params.style.style_type,
          style_weight: params.style.style_weight || 0.8
        };
      }
    }


    return payload;
  }

  private async processImageResponse(response: ImageGenerationResponse, params: ImageGenerationParams): Promise<ImageGenerationResult> {
    // Handle both URL and base64 responses
    const imageUrls = response.data?.image_urls || [];
    const imageBase64 = response.data?.image_base64 || [];
    
    if (!imageUrls.length && !imageBase64.length) {
      throw new Error('No images generated in API response');
    }

    // Download and save images
    const savedFiles: string[] = [];
    const errors: string[] = [];
    const imageSources = imageUrls.length ? imageUrls : imageBase64;

    for (let i = 0; i < imageSources.length; i++) {
      try {
        const filename = FileHandler.generateUniqueFilename(params.outputFile, i, imageSources.length);
        
        if (imageBase64.length && !imageUrls.length) {
          // Save base64 image
          await FileHandler.saveBase64Image(imageBase64[i], filename);
        } else {
          // Download from URL
          await FileHandler.downloadFile(imageSources[i], filename);
        }
        
        savedFiles.push(filename);
      } catch (error: any) {
        errors.push(`Image ${i + 1}: ${error.message}`);
      }
    }

    if (savedFiles.length === 0) {
      throw new Error(`Failed to save any images: ${errors.join('; ')}`);
    }

    // Use the actual model that was used
    const modelUsed = params.style ? 'image-01-live' : 'image-01';
    
    const result: ImageGenerationResult = {
      success: true,
      files: savedFiles,
      count: savedFiles.length,
      model: modelUsed,
      prompt: params.prompt
    };

    if (errors.length > 0) {
      result.warnings = errors;
    }

    return result;
  }

  // Utility methods
  async validateSubjectReference(reference: string): Promise<string | null> {
    if (!reference) return null;
    
    try {
      return await FileHandler.convertToBase64(reference);
    } catch (error: any) {
      throw new Error(`Invalid subject reference: ${error.message}`);
    }
  }

  getSupportedModels(): string[] {
    return Object.keys(MODELS.IMAGE);
  }

  getSupportedAspectRatios(): readonly string[] {
    return CONSTRAINTS.IMAGE.ASPECT_RATIOS;
  }

  getModelInfo(modelName: string): { name: string; description: string } | null {
    return MODELS.IMAGE[modelName as ImageModel] || null;
  }

  // Health check override for image service
  override async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; timestamp: string; error?: string }> {
    try {
      // Test with a minimal image generation request (we could use a different endpoint if available)
      // For now, just return healthy if we can construct a payload
      const testParams: ImageGenerationParams = {
        prompt: 'test',
        outputFile: '/tmp/test.jpg'
      };
      
      // Just validate we can build a payload, don't actually make the request
      this.buildPayload(testParams);
      
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error: any) {
      return { 
        status: 'unhealthy', 
        error: ErrorHandler.formatErrorForUser(error),
        timestamp: new Date().toISOString() 
      };
    }
  }
}