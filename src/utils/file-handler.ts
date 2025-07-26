import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import type { RequestInit } from 'node-fetch';
import { MinimaxError } from './error-handler.ts';

interface DownloadOptions {
  timeout?: number;
  fetchOptions?: RequestInit;
}

interface FileStats {
  size: number;
  isFile(): boolean;
  isDirectory(): boolean;
  mtime: Date;
  ctime: Date;
}

export class FileHandler {
  static async ensureDirectoryExists(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error: any) {
      throw new MinimaxError(`Failed to create directory: ${error.message}`);
    }
  }

  static async writeFile(filePath: string, data: string | Buffer, options: any = {}): Promise<void> {
    try {
      await this.ensureDirectoryExists(filePath);
      await fs.writeFile(filePath, data, options);
    } catch (error: any) {
      throw new MinimaxError(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  static async readFile(filePath: string, options: any = {}): Promise<Buffer | string> {
    try {
      return await fs.readFile(filePath, options);
    } catch (error: any) {
      throw new MinimaxError(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  static async downloadFile(url: string, outputPath: string, options: DownloadOptions = {}): Promise<string> {
    try {
      await this.ensureDirectoryExists(outputPath);
      
      const response = await fetch(url, {
        ...options.fetchOptions
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.buffer();
      await fs.writeFile(outputPath, buffer);
      
      return outputPath;
    } catch (error: any) {
      throw new MinimaxError(`Failed to download file from ${url}: ${error.message}`);
    }
  }

  static async convertToBase64(input: string): Promise<string> {
    try {
      let buffer: Buffer;
      
      if (input.startsWith('http://') || input.startsWith('https://')) {
        // Download URL and convert to base64
        const response = await fetch(input);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        buffer = await response.buffer();
      } else {
        // Read local file
        const fileData = await this.readFile(input);
        buffer = Buffer.isBuffer(fileData) ? fileData : Buffer.from(fileData as string);
      }
      
      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } catch (error: any) {
      throw new MinimaxError(`Failed to convert to base64: ${error.message}`);
    }
  }

  static generateUniqueFilename(basePath: string, index: number, total: number): string {
    if (total === 1) {
      return basePath;
    }
    
    const dir = path.dirname(basePath);
    const ext = path.extname(basePath);
    const name = path.basename(basePath, ext);
    
    return path.join(dir, `${name}_${String(index + 1).padStart(2, '0')}${ext}`);
  }

  static validateFilePath(filePath: string): boolean {
    if (!filePath || typeof filePath !== 'string') {
      throw new MinimaxError('File path must be a non-empty string');
    }
    
    if (!path.isAbsolute(filePath)) {
      throw new MinimaxError('File path must be absolute');
    }
    
    return true;
  }

  static getFileExtension(format: string): string {
    const extensions: Record<string, string> = {
      mp3: '.mp3',
      wav: '.wav',
      flac: '.flac',
      pcm: '.pcm',
      jpg: '.jpg',
      jpeg: '.jpeg',
      png: '.png',
      webp: '.webp'
    };
    
    return extensions[format.toLowerCase()] || `.${format}`;
  }

  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async getFileStats(filePath: string): Promise<FileStats> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        isFile: () => stats.isFile(),
        isDirectory: () => stats.isDirectory(),
        mtime: stats.mtime,
        ctime: stats.ctime
      };
    } catch (error: any) {
      throw new MinimaxError(`Failed to get file stats: ${error.message}`);
    }
  }

  static async saveBase64Image(base64Data: string, outputPath: string): Promise<void> {
    try {
      await this.ensureDirectoryExists(outputPath);
      
      // Remove data URL prefix if present
      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      
      await fs.writeFile(outputPath, buffer);
    } catch (error: any) {
      throw new MinimaxError(`Failed to save base64 image: ${error.message}`);
    }
  }
}