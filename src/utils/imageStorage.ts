// Image storage utilities for saving generated images
import { memoryManager } from './memoryManager';

export interface ImageMetadata {
  id: string;
  filename: string;
  prompt: string;
  description?: string;
  style: string;
  model: string;
  provider: string;
  dimensions: { width: number; height: number };
  generatedAt: string;
  tags: string[];
  localPath?: string;
  originalUrl: string;
}

export class ImageStorageManager {
  private baseDir: string;
  
  constructor() {
    // Base directory for storing images
    this.baseDir = './claudia-images';
  }

  /**
   * Generate organized folder structure
   */
  getImageFolders(): { [key: string]: string } {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    return {
      base: this.baseDir,
      avatars: `${this.baseDir}/avatars`,
      daily: `${this.baseDir}/avatars/${year}/${month}/${day}`,
      custom: `${this.baseDir}/custom`,
      exports: `${this.baseDir}/exports`
    };
  }

  /**
   * Generate descriptive filename from prompt and metadata
   */
  generateFilename(prompt: string, _metadata: Partial<ImageMetadata> = {}): string {
    // Extract key descriptive words from prompt
    const descriptiveWords = this.extractKeyWords(prompt);
    
    // Create timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    
    // Generate unique ID (short)
    const uniqueId = Math.random().toString(36).substring(2, 8);
    
    // Combine elements
    const baseName = descriptiveWords.slice(0, 3).join('_');
    const filename = `claudia_${baseName}_${timestamp}_${timeStr}_${uniqueId}.jpg`;
    
    // Clean filename
    return this.sanitizeFilename(filename);
  }

  /**
   * Extract meaningful keywords from prompt for filename
   */
  private extractKeyWords(prompt: string): string[] {
    // Remove common words and extract meaningful descriptors
    const commonWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'claudia', 'young', 'woman', 'photo', 'image', 'picture', 'digital', 'art', 'style'
    ]);
    
    const words = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .slice(0, 5); // Take first 5 meaningful words
    
    return words;
  }

  /**
   * Sanitize filename for filesystem
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .toLowerCase();
  }

  /**
   * Download and save image from URL
   */
  async saveImage(imageUrl: string, metadata: ImageMetadata): Promise<string> {
    try {
      console.log('💾 Saving image:', metadata.filename);
      
      // In browser environment, we'll save to localStorage/IndexedDB
      // and provide download functionality
      if (typeof window !== 'undefined') {
        return await this.saveImageBrowser(imageUrl, metadata);
      }
      
      // In Node.js environment, save to filesystem
      return await this.saveImageFilesystem(imageUrl, metadata);
      
    } catch (error) {
      console.error('Failed to save image:', error);
      throw error;
    }
  }

  /**
   * Save image in browser environment
   */
  private async saveImageBrowser(imageUrl: string, metadata: ImageMetadata): Promise<string> {
    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      
      // Store metadata in localStorage
      const savedImages = this.getSavedImagesList();
      savedImages.push(metadata);
      localStorage.setItem('claudia-saved-images', JSON.stringify(savedImages));
      
      // Create managed object URL for local reference
      const localUrl = memoryManager.createObjectURL(blob, 'ImageStorage.saveImageBrowser');
      
      // Also trigger automatic download
      this.downloadImage(blob, metadata.filename);
      
      console.log('✅ Image saved (browser):', metadata.filename);
      return localUrl;
      
    } catch (error) {
      console.error('Failed to save image in browser:', error);
      throw error;
    }
  }

  /**
   * Save image to filesystem (Node.js environment)
   */
  private async saveImageFilesystem(imageUrl: string, _metadata: ImageMetadata): Promise<string> {
    // This would be implemented for Node.js/Electron environments
    // For now, return the original URL
    console.log('📁 Filesystem save not implemented for web environment');
    return imageUrl;
  }

  /**
   * Trigger download of image blob
   */
  private downloadImage(blob: Blob, filename: string): void {
    const url = memoryManager.createObjectURL(blob, 'ImageStorage.downloadImage');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Use managed cleanup
    memoryManager.revokeObjectURL(url);
  }

  /**
   * Get list of saved images from localStorage
   */
  getSavedImagesList(): ImageMetadata[] {
    try {
      const saved = localStorage.getItem('claudia-saved-images');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load saved images list:', error);
      return [];
    }
  }

  /**
   * Create image metadata
   */
  createImageMetadata(
    prompt: string, 
    imageUrl: string, 
    additionalData: Partial<ImageMetadata> = {}
  ): ImageMetadata {
    const id = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const filename = this.generateFilename(prompt, additionalData);
    
    return {
      id,
      filename,
      prompt,
      description: additionalData.description,
      style: additionalData.style || 'default',
      model: additionalData.model || 'unknown',
      provider: additionalData.provider || 'unknown',
      dimensions: additionalData.dimensions || { width: 512, height: 512 },
      generatedAt: new Date().toISOString(),
      tags: this.generateTags(prompt),
      originalUrl: imageUrl,
      ...additionalData
    };
  }

  /**
   * Generate tags from prompt for better organization
   */
  private generateTags(prompt: string): string[] {
    const tags: string[] = ['claudia'];
    const lowerPrompt = prompt.toLowerCase();
    
    // Emotion tags
    if (lowerPrompt.includes('smile') || lowerPrompt.includes('happy')) tags.push('happy');
    if (lowerPrompt.includes('sad') || lowerPrompt.includes('crying')) tags.push('sad');
    if (lowerPrompt.includes('excited') || lowerPrompt.includes('energetic')) tags.push('excited');
    if (lowerPrompt.includes('curious') || lowerPrompt.includes('wondering')) tags.push('curious');
    if (lowerPrompt.includes('mischievous') || lowerPrompt.includes('playful')) tags.push('playful');
    
    // Pose tags
    if (lowerPrompt.includes('sitting')) tags.push('sitting');
    if (lowerPrompt.includes('standing')) tags.push('standing');
    if (lowerPrompt.includes('leaning')) tags.push('leaning');
    if (lowerPrompt.includes('lying') || lowerPrompt.includes('laying')) tags.push('lying');
    
    // Clothing tags
    if (lowerPrompt.includes('dress')) tags.push('dress');
    if (lowerPrompt.includes('casual')) tags.push('casual');
    if (lowerPrompt.includes('formal')) tags.push('formal');
    if (lowerPrompt.includes('pajamas') || lowerPrompt.includes('sleepwear')) tags.push('sleepwear');
    
    // Setting tags
    if (lowerPrompt.includes('bed') || lowerPrompt.includes('bedroom')) tags.push('bedroom');
    if (lowerPrompt.includes('desk') || lowerPrompt.includes('office')) tags.push('workspace');
    if (lowerPrompt.includes('cozy') || lowerPrompt.includes('comfortable')) tags.push('cozy');
    if (lowerPrompt.includes('digital') || lowerPrompt.includes('nook')) tags.push('digital-nook');
    
    return tags;
  }

  /**
   * Clear old images from storage (keep last N images)
   */
  cleanupOldImages(keepCount: number = 50): void {
    try {
      const savedImages = this.getSavedImagesList();
      if (savedImages.length > keepCount) {
        // Sort by date and keep the most recent
        savedImages.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
        const toKeep = savedImages.slice(0, keepCount);
        
        localStorage.setItem('claudia-saved-images', JSON.stringify(toKeep));
        console.log(`🧹 Cleaned up old images, kept ${toKeep.length} most recent`);
      }
    } catch (error) {
      console.error('Failed to cleanup old images:', error);
    }
  }
}

// Create singleton instance
export const imageStorage = new ImageStorageManager();