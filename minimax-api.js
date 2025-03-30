import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate an image using Minimax API and save it to a file
 * @param {string} prompt - The description for image generation
 * @param {string} apiKey - The Minimax API key
 * @param {Object} options - Additional options for image generation
 * @param {string} outputDir - Directory to save the generated image
 * @param {string} outputFile - Absolute path to save the generated image
 * @returns {Promise<Object>} - Object containing the image information
 */
export async function generateImage(prompt, apiKey, options = {}, outputDir, outputFile) {
  if (!apiKey) {
    throw new Error('Minimax API key is required');
  }

  if (!outputFile) {
    throw new Error('Output file path is required');
  }

  const url = "https://api.minimax.chat/v1/image_generation";
  
  const payload = {
    model: options.model || "image-01",
    prompt: prompt,
    aspect_ratio: options.aspectRatio || "1:1",
    response_format: "url",
    n: options.n || 1,
    prompt_optimizer: options.promptOptimizer !== undefined ? options.promptOptimizer : true
  };
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  try {
    console.error(`Generating image with prompt: ${prompt}`);
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

    // Download and save images
    const savedImages = [];
    if (data.data && data.data.image_urls && data.data.image_urls.length > 0) {
      for (let i = 0; i < data.data.image_urls.length; i++) {
        const imageUrl = data.data.image_urls[i];
        const timestamp = Date.now();
        
        // If outputFile is specified and this is the first image, use that path
        let filePath;
        let filename;
        
        if (outputFile && i === 0) {
          filePath = outputFile;
          filename = path.basename(outputFile);
        } else {
          filename = `image_${timestamp}_${i}.jpg`;
          filePath = path.join(absoluteOutputDir, filename);
        }
        
        // Download the image
        const imageResponse = await fetch(imageUrl);
        const buffer = await imageResponse.buffer();
        fs.writeFileSync(filePath, buffer);
        
        savedImages.push({
          url: imageUrl,
          localPath: filePath,
          filename: filename
        });
      }
    }

    return {
      success: true,
      requestId: data.id,
      images: savedImages,
      metadata: data.metadata,
      rawResponse: data
    };
  } catch (error) {
    console.error('Error generating image:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
