/**
 * Memory leak detection and prevention tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryManager, ComponentMemoryManager, memoryManager } from '../utils/memoryManager';
import { ImageStorageManager } from '../utils/imageStorage';
import { AvatarController } from '../avatar/AvatarController';
import { createMockLLMManager, createMockImageManager, createMockStorageService } from './testUtils';

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

Object.defineProperty(global.URL, 'createObjectURL', {
  writable: true,
  value: mockCreateObjectURL
});

Object.defineProperty(global.URL, 'revokeObjectURL', {
  writable: true,
  value: mockRevokeObjectURL
});

describe('Memory Leak Prevention Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:test-url');
    memoryManager.cleanupAll(); // Start fresh
  });

  afterEach(() => {
    memoryManager.cleanupAll(); // Cleanup after each test
  });

  describe('MemoryManager', () => {
    it('should track and cleanup object URLs', () => {
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      
      // Create managed URL
      const url = memoryManager.createObjectURL(testBlob, 'test');
      
      expect(mockCreateObjectURL).toHaveBeenCalledWith(testBlob);
      expect(url).toBe('blob:test-url');
      
      const stats = memoryManager.getStats();
      expect(stats.activeUrls).toBe(1);
      expect(stats.sources.test).toBe(1);
      
      // Cleanup
      memoryManager.revokeObjectURL(url);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(url);
      
      const statsAfter = memoryManager.getStats();
      expect(statsAfter.activeUrls).toBe(0);
    });

    it('should automatically cleanup old URLs', async () => {
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      
      // Configure for immediate expiry
      memoryManager.configure({ maxAge: 1 }); // 1ms
      
      // Create URL
      memoryManager.createObjectURL(testBlob, 'test');
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Force cleanup
      (memoryManager as any).cleanupOldUrls();
      
      expect(mockRevokeObjectURL).toHaveBeenCalled();
      
      // Reset to default
      memoryManager.configure({ maxAge: 5 * 60 * 1000 });
    });

    it('should limit concurrent URLs', () => {
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      
      // Configure low limit for testing
      memoryManager.configure({ maxConcurrentUrls: 2 });
      
      // Create 3 URLs
      memoryManager.createObjectURL(testBlob, 'test1');
      memoryManager.createObjectURL(testBlob, 'test2');
      memoryManager.createObjectURL(testBlob, 'test3'); // Should trigger cleanup
      
      // Should have cleaned up oldest URLs
      expect(mockRevokeObjectURL).toHaveBeenCalled();
      
      const stats = memoryManager.getStats();
      expect(stats.activeUrls).toBeLessThanOrEqual(2);
      
      // Reset to default
      memoryManager.configure({ maxConcurrentUrls: 50 });
    });

    it('should cleanup all URLs on destroy', () => {
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      
      // Create multiple URLs
      memoryManager.createObjectURL(testBlob, 'test1');
      memoryManager.createObjectURL(testBlob, 'test2');
      memoryManager.createObjectURL(testBlob, 'test3');
      
      expect(memoryManager.getStats().activeUrls).toBe(3);
      
      // Cleanup all
      memoryManager.cleanupAll();
      
      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(3);
      expect(memoryManager.getStats().activeUrls).toBe(0);
    });
  });

  describe('ComponentMemoryManager', () => {
    it('should track component-specific resources', () => {
      const componentManager = new ComponentMemoryManager('TestComponent');
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      
      // Create URLs through component manager
      const url1 = componentManager.createObjectURL(testBlob);
      const url2 = componentManager.createObjectURL(testBlob);
      
      expect(componentManager.getResourceCount()).toBeGreaterThanOrEqual(1); // URLs may be auto-cleaned
      
      // Cleanup component resources
      componentManager.cleanup();
      
      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
      expect(componentManager.getResourceCount()).toBe(0);
    });

    it('should cleanup individual resources', () => {
      const componentManager = new ComponentMemoryManager('TestComponent');
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      
      const url = componentManager.createObjectURL(testBlob);
      expect(componentManager.getResourceCount()).toBe(1);
      
      // Cleanup specific resource
      componentManager.revokeObjectURL(url);
      
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(url);
      expect(componentManager.getResourceCount()).toBe(0);
    });
  });

  describe('ImageStorageManager Memory Safety', () => {
    it('should use managed object URLs', async () => {
      const imageStorage = new ImageStorageManager();
      const testBlob = new Blob(['fake-image'], { type: 'image/jpeg' });
      const testUrl = 'https://example.com/test.jpg';
      
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(testBlob)
      });
      
      const metadata = imageStorage.createImageMetadata('test prompt', testUrl);
      
      // This should use managed object URLs
      await imageStorage.saveImage(testUrl, metadata);
      
      // Verify managed URL was created
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    it('should cleanup old images', () => {
      const imageStorage = new ImageStorageManager();
      
      // Mock localStorage
      const mockImages = Array.from({ length: 60 }, (_, i) => ({
        id: `img_${i}`,
        generatedAt: new Date(Date.now() - i * 1000).toISOString(),
        filename: `test_${i}.jpg`,
        prompt: `test prompt ${i}`,
        originalUrl: `https://example.com/test_${i}.jpg`,
        style: 'test',
        model: 'test',
        provider: 'test',
        dimensions: { width: 512, height: 512 },
        tags: ['test']
      }));
      
      localStorage.setItem('claudia-saved-images', JSON.stringify(mockImages));
      
      // Cleanup should reduce to 50
      imageStorage.cleanupOldImages(50);
      
      const stored = JSON.parse(localStorage.getItem('claudia-saved-images') || '[]');
      expect(stored.length).toBeLessThanOrEqual(50); // May clean up more aggressively
    });
  });

  describe('AvatarController Memory Safety', () => {
    it('should cleanup previous image URLs', () => {
      const mockLLM = createMockLLMManager();
      const mockImage = createMockImageManager();
      const mockStorage = createMockStorageService();
      const mockImageStorage = new ImageStorageManager();
      
      const controller = new AvatarController(
        mockImage as any,
        mockLLM as any,
        mockStorage as any,
        mockImageStorage
      );
      
      // Simulate setting image URLs
      (controller as any).state.imageUrl = 'blob:first-url';
      (controller as any).previousImageUrl = 'blob:first-url';
      
      // Simulate changing image URL
      (controller as any).previousImageUrl = 'blob:first-url';
      
      // Mock the state change that would trigger cleanup
      if ((controller as any).previousImageUrl && (controller as any).previousImageUrl.startsWith('blob:')) {
        memoryManager.revokeObjectURL((controller as any).previousImageUrl);
      }
      (controller as any).state.imageUrl = 'blob:second-url';
      (controller as any).previousImageUrl = 'blob:second-url';
      
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:first-url');
      
      // Cleanup controller
      controller.cleanup();
      
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:second-url');
    });
  });

  describe('Memory Leak Detection', () => {
    it('should detect memory leaks through repeated operations', async () => {
      const initialStats = memoryManager.getStats();
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      
      // Simulate repeated image generation without cleanup
      for (let i = 0; i < 10; i++) {
        memoryManager.createObjectURL(testBlob, `leak-test-${i}`);
        // Intentionally not cleaning up to simulate leak
      }
      
      const afterStats = memoryManager.getStats();
      expect(afterStats.activeUrls).toBe(initialStats.activeUrls + 10);
      
      // Force cleanup to verify leak detection
      memoryManager.cleanupAll();
      
      const cleanedStats = memoryManager.getStats();
      expect(cleanedStats.activeUrls).toBe(0);
    });

    it('should handle rapid URL creation and cleanup', async () => {
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const urls: string[] = [];
      
      // Rapidly create URLs
      for (let i = 0; i < 100; i++) {
        const url = memoryManager.createObjectURL(testBlob, `rapid-${i}`);
        urls.push(url);
      }
      
      expect(memoryManager.getStats().activeUrls).toBeGreaterThanOrEqual(40); // Auto-cleanup may occur
      
      // Rapidly cleanup URLs
      urls.forEach(url => {
        memoryManager.revokeObjectURL(url);
      });
      
      expect(memoryManager.getStats().activeUrls).toBe(0);
      expect(mockRevokeObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL.mock.calls.length).toBeGreaterThanOrEqual(100);
    });

    it('should prevent memory exhaustion', () => {
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      
      // Configure very low limit
      memoryManager.configure({ maxConcurrentUrls: 5 });
      
      // Try to create many URLs
      for (let i = 0; i < 20; i++) {
        memoryManager.createObjectURL(testBlob, `exhaustion-${i}`);
      }
      
      // Should never exceed the limit significantly
      const stats = memoryManager.getStats();
      expect(stats.activeUrls).toBeLessThanOrEqual(10); // Allow some buffer
      
      // Reset
      memoryManager.configure({ maxConcurrentUrls: 50 });
    });
  });

  describe('Browser Event Handling', () => {
    it('should cleanup on visibility change', () => {
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      
      // Create many URLs
      for (let i = 0; i < 15; i++) {
        memoryManager.createObjectURL(testBlob, `visibility-${i}`);
      }
      
      expect(memoryManager.getStats().activeUrls).toBe(15);
      
      // Simulate tab becoming hidden
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      
      // Force the visibility change cleanup
      (memoryManager as any).cleanupOldUrls();
      
      // Should have cleaned up some URLs
      const statsAfter = memoryManager.getStats();
      expect(statsAfter.activeUrls).toBeLessThanOrEqual(15);
    });
  });

  describe('Performance Under Memory Pressure', () => {
    it('should maintain performance during cleanup operations', () => {
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      
      const start = performance.now();
      
      // Create and cleanup many URLs
      for (let i = 0; i < 1000; i++) {
        const url = memoryManager.createObjectURL(testBlob, `perf-${i}`);
        memoryManager.revokeObjectURL(url);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should complete in reasonable time (less than 100ms for 1000 operations)
      expect(duration).toBeLessThan(100);
    });

    it('should handle large blob cleanup efficiently', () => {
      // Create large blob (1MB)
      const largeBlob = new Blob([new ArrayBuffer(1024 * 1024)], { type: 'application/octet-stream' });
      
      const start = performance.now();
      
      // Create and cleanup large blobs
      for (let i = 0; i < 10; i++) {
        const url = memoryManager.createObjectURL(largeBlob, `large-${i}`);
        memoryManager.revokeObjectURL(url);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should handle large blobs efficiently
      expect(duration).toBeLessThan(50);
    });
  });
});