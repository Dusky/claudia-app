import type { Command, CommandContext, CommandResult } from '../types';
import type { TerminalLine } from '../../terminal/TerminalDisplay';
import { imageStorage } from '../../utils/imageStorage';

async function listImages(lines: TerminalLine[], timestamp: string): Promise<CommandResult> {
    try {
      const savedImages = imageStorage.getSavedImagesList();
      
      lines.push({
        id: `images-header-${timestamp}`,
        type: 'system',
        content: '**=== SAVED CLAUDIA IMAGES ===**',
        timestamp,
        user: 'claudia'
      });

      if (savedImages.length === 0) {
        lines.push({
          id: `images-empty-${timestamp}`,
          type: 'output',
          content: 'No saved images found. Generate some with `/imagine` or chat with Claudia!',
          timestamp,
          user: 'claudia'
        });
      } else {
        // Show most recent 10 images
        const recentImages = savedImages
          .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
          .slice(0, 10);

        lines.push({
          id: `images-count-${timestamp}`,
          type: 'output',
          content: `Total saved: ${savedImages.length} images (showing ${recentImages.length} most recent)`,
          timestamp,
          user: 'claudia'
        });

        lines.push({
          id: `images-spacer1-${timestamp}`,
          type: 'output',
          content: '',
          timestamp,
          user: 'claudia'
        });

        recentImages.forEach((img, index) => {
          const date = new Date(img.generatedAt).toLocaleDateString();
          const time = new Date(img.generatedAt).toLocaleTimeString();
          const truncatedPrompt = img.prompt.length > 60 
            ? img.prompt.substring(0, 60) + '...' 
            : img.prompt;
          
          lines.push({
            id: `images-item-${index}-${timestamp}`,
            type: 'output',
            content: `**${img.filename}**`,
            timestamp,
            user: 'claudia'
          });
          
          lines.push({
            id: `images-item-details-${index}-${timestamp}`,
            type: 'output',
            content: `  📅 ${date} ${time} | 🎨 ${img.model} | 📝 "${truncatedPrompt}"`,
            timestamp,
            user: 'claudia'
          });

          if (img.tags && img.tags.length > 0) {
            lines.push({
              id: `images-item-tags-${index}-${timestamp}`,
              type: 'output',
              content: `  🏷️ Tags: ${img.tags.join(', ')}`,
              timestamp,
              user: 'claudia'
            });
          }

          lines.push({
            id: `images-item-spacer-${index}-${timestamp}`,
            type: 'output',
            content: '',
            timestamp,
            user: 'claudia'
          });
        });

        if (savedImages.length > 10) {
          lines.push({
            id: `images-more-${timestamp}`,
            type: 'output',
            content: `... and ${savedImages.length - 10} more images`,
            timestamp,
            user: 'claudia'
          });
        }
      }

      lines.push({
        id: `images-tip-${timestamp}`,
        type: 'system',
        content: '💡 Tip: Use `/images stats` for detailed statistics or `/images clear` to remove old images.',
        timestamp,
        user: 'claudia'
      });

      return { success: true, lines };

    } catch (error) {
      lines.push({
        id: `images-error-${timestamp}`,
        type: 'error',
        content: `Error: Failed to list images: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp,
        user: 'claudia'
      });
      return { success: false, lines };
    }
}

async function showStats(lines: TerminalLine[], timestamp: string): Promise<CommandResult> {
    try {
      const savedImages = imageStorage.getSavedImagesList();
      
      lines.push({
        id: `images-stats-header-${timestamp}`,
        type: 'system',
        content: '**=== IMAGE STATISTICS ===**',
        timestamp,
        user: 'claudia'
      });

      // Basic stats
      lines.push({
        id: `images-stats-total-${timestamp}`,
        type: 'output',
        content: `📸 Total Images: ${savedImages.length}`,
        timestamp,
        user: 'claudia'
      });

      if (savedImages.length > 0) {
        // Provider breakdown
        const providerStats = savedImages.reduce((acc, img) => {
          acc[img.provider] = (acc[img.provider] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        lines.push({
          id: `images-stats-providers-${timestamp}`,
          type: 'output',
          content: '🔧 By Provider:',
          timestamp,
          user: 'claudia'
        });

        Object.entries(providerStats).forEach(([provider, count]) => {
          lines.push({
            id: `images-stats-provider-${provider}-${timestamp}`,
            type: 'output',
            content: `  ${provider}: ${count} images`,
            timestamp,
            user: 'claudia'
          });
        });

        // Model breakdown
        const modelStats = savedImages.reduce((acc, img) => {
          acc[img.model] = (acc[img.model] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        lines.push({
          id: `images-stats-models-${timestamp}`,
          type: 'output',
          content: '🤖 By Model:',
          timestamp,
          user: 'claudia'
        });

        Object.entries(modelStats).forEach(([model, count]) => {
          lines.push({
            id: `images-stats-model-${model}-${timestamp}`,
            type: 'output',
            content: `  ${model}: ${count} images`,
            timestamp,
            user: 'claudia'
          });
        });

        // Popular tags
        const allTags = savedImages.flatMap(img => img.tags || []);
        const tagStats = allTags.reduce((acc, tag) => {
          acc[tag] = (acc[tag] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const topTags = Object.entries(tagStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);

        if (topTags.length > 0) {
          lines.push({
            id: `images-stats-tags-${timestamp}`,
            type: 'output',
            content: '🏷️ Popular Tags:',
            timestamp,
            user: 'claudia'
          });

          topTags.forEach(([tag, count]) => {
            lines.push({
              id: `images-stats-tag-${tag}-${timestamp}`,
              type: 'output',
              content: `  ${tag}: ${count} images`,
              timestamp,
              user: 'claudia'
            });
          });
        }

        // Date range
        const dates = savedImages.map(img => new Date(img.generatedAt).getTime());
        const oldest = new Date(Math.min(...dates));
        const newest = new Date(Math.max(...dates));

        lines.push({
          id: `images-stats-range-${timestamp}`,
          type: 'output',
          content: `📅 Date Range: ${oldest.toLocaleDateString()} - ${newest.toLocaleDateString()}`,
          timestamp,
          user: 'claudia'
        });
      }

      return { success: true, lines };

    } catch (error) {
      lines.push({
        id: `images-stats-error-${timestamp}`,
        type: 'error',
        content: `Error: Failed to generate statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp,
        user: 'claudia'
      });
      return { success: false, lines };
    }
}

async function clearImages(lines: TerminalLine[], timestamp: string): Promise<CommandResult> {
    try {
      const savedImages = imageStorage.getSavedImagesList();
      const count = savedImages.length;

      if (count === 0) {
        lines.push({
          id: `images-clear-empty-${timestamp}`,
          type: 'output',
          content: 'No saved images to clear.',
          timestamp,
          user: 'claudia'
        });
      } else {
        // Clear the list
        localStorage.removeItem('claudia-saved-images');
        
        lines.push({
          id: `images-clear-success-${timestamp}`,
          type: 'output',
          content: `✅ Cleared ${count} saved image records.`,
          timestamp,
          user: 'claudia'
        });

        lines.push({
          id: `images-clear-note-${timestamp}`,
          type: 'system',
          content: 'Note: Downloaded image files are still in your Downloads folder.',
          timestamp,
          user: 'claudia'
        });
      }

      return { success: true, lines };

    } catch (error) {
      lines.push({
        id: `images-clear-error-${timestamp}`,
        type: 'error',
        content: `Error: Failed to clear images: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp,
        user: 'claudia'
      });
      return { success: false, lines };
    }
}

export const imagesCommand: Command = {
  name: 'images',
  description: 'Manage saved Claudia images',
  usage: '/images [list|clear|stats]',
  aliases: ['img', 'gallery'],
  
  async execute(args: string[], _context: CommandContext): Promise<CommandResult> {
    const lines: TerminalLine[] = [];
    const timestamp = new Date().toISOString();
    const subCommand = args[0]?.toLowerCase() || 'list';

    switch (subCommand) {
      case 'list':
        return await listImages(lines, timestamp);
      
      case 'stats':
        return await showStats(lines, timestamp);
        
      case 'clear':
        return await clearImages(lines, timestamp);
        
      default:
        lines.push({
          id: `images-unknown-${timestamp}`,
          type: 'error',
          content: `Error: Unknown images command: ${subCommand}. Use: list, stats, clear.`,
          timestamp,
          user: 'claudia'
        });
        return { success: false, lines };
    }
  }
};