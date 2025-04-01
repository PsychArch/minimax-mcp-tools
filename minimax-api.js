import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Convert a local file to base64 string
 * @param {string} filePath - Path to the local file
 * @returns {Promise<string>} - Base64 encoded string with data URI scheme
 */
async function fileToBase64(filePath) {
  // Read file as binary buffer
  const data = await fs.promises.readFile(filePath);
  
  // Convert to base64
  const base64 = data.toString('base64');
  
  // Determine MIME type based on file extension
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 
                  (ext === '.gif' ? 'image/gif' : 'image/jpeg');
  
  // Return in data URI format
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Process subject reference to get base64 or URL
 * @param {string} reference - Local file path or URL
 * @returns {Promise<string>} - Processed reference string
 */
async function processSubjectReference(reference) {
  if (!reference) return null;
  
  // Check if it's a URL (starts with http:// or https://)
  if (reference.startsWith('http://') || reference.startsWith('https://')) {
    return reference; // It's a URL, return as is
  } else if (reference.startsWith('data:image/')) {
    return reference; // It's already a data URI, return as is
  } else {
    // Treat as local file path
    if (!fs.existsSync(reference)) {
      throw new Error(`Subject reference file not found: ${reference}`);
    }
    console.error(`Converting file to base64: ${reference}`);
    return await fileToBase64(reference);
  }
}

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

  // Process subject reference if provided
  if (options.subjectReference) {
    try {
      const processedReference = await processSubjectReference(options.subjectReference);
      if (processedReference) {
        console.error(`Using subject reference: ${processedReference.substring(0, 50)}...`);
        payload.subject_reference = [
          {
            type: "character",
            image_file: processedReference
          }
        ];
      }
    } catch (error) {
      console.error(`Error processing subject reference: ${error.message}`);
      throw new Error(`Failed to process subject reference: ${error.message}`);
    }
  }
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  // Check if output directory exists before proceeding
  const absoluteOutputDir = path.dirname(outputFile);
  if (!fs.existsSync(absoluteOutputDir)) {
    throw new Error(`Output directory does not exist: ${absoluteOutputDir}. Please provide a valid existing directory.`);
  }

  try {
    console.error(`Generating image with prompt: ${prompt}`);
    // Add debugging output to help diagnose issues
    console.error(`Making request to ${url} with payload: ${JSON.stringify({
      ...payload,
      subject_reference: payload.subject_reference ? 
        [{...payload.subject_reference[0], image_file: payload.subject_reference[0].image_file.substring(0, 50) + '...'}] : 
        undefined
    })}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.error(`API response: ${JSON.stringify(data)}`);
    
    if (data.base_resp && data.base_resp.status_code !== 0) {
      throw new Error(`Minimax API error: ${data.base_resp.status_msg}`);
    }

    // Download and save images
    const savedImages = [];
    if (data.data && data.data.image_urls && data.data.image_urls.length > 0) {
      for (let i = 0; i < data.data.image_urls.length; i++) {
        const imageUrl = data.data.image_urls[i];
        const timestamp = Date.now();
        
        // Handle multiple images with numbered filenames
        let filePath;
        let filename;
        
        if (i === 0 && data.data.image_urls.length === 1) {
          // Single image case - use the exact outputFile
          filePath = outputFile;
          filename = path.basename(outputFile);
        } else {
          // Multiple images case - append number to filename
          const fileExt = path.extname(outputFile);
          const fileBaseName = path.basename(outputFile, fileExt);
          filename = `${fileBaseName}-${i+1}${fileExt}`;
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
