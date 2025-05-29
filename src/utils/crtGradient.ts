/**
 * CRT Gradient Generator
 * Creates authentic CRT monitor gradient patterns for backgrounds
 */

export interface CRTGradientOptions {
  width: number;
  height: number;
  curvature?: number; // 0-1, how curved the screen appears
  scanlines?: boolean; // Whether to include scanlines
  scanlineOpacity?: number; // 0-1, opacity of scanlines
  vignette?: boolean; // Whether to add edge darkening
  vignetteIntensity?: number; // 0-1, how strong the vignette is
  phosphorGlow?: boolean; // Whether to simulate phosphor glow
  noiseAmount?: number; // 0-1, amount of static noise
  theme?: 'green' | 'amber' | 'blue' | 'white'; // Phosphor color
}

/**
 * Generates a CRT-style gradient as a CSS background string
 */
export function generateCRTGradientCSS(options: CRTGradientOptions): string {
  const {
    curvature = 0.3,
    scanlines = true,
    scanlineOpacity = 0.1,
    vignette = true,
    vignetteIntensity = 0.4,
    phosphorGlow = true,
    theme = 'green'
  } = options;

  const gradients: string[] = [];

  // Base CRT screen curvature simulation with radial gradient
  if (curvature > 0) {
    gradients.push(`radial-gradient(ellipse 100% 100% at center center, 
      rgba(0,0,0,0) 0%, 
      rgba(0,0,0,0) ${(1 - curvature) * 60}%, 
      rgba(0,0,0,${curvature * 0.3}) ${(1 - curvature) * 80}%, 
      rgba(0,0,0,${curvature * 0.7}) 100%
    )`);
  }

  // Vignette effect (darkening at edges)
  if (vignette) {
    gradients.push(`radial-gradient(ellipse 120% 120% at center center,
      rgba(0,0,0,0) 0%,
      rgba(0,0,0,0) 40%,
      rgba(0,0,0,${vignetteIntensity * 0.3}) 70%,
      rgba(0,0,0,${vignetteIntensity * 0.6}) 100%
    )`);
  }

  // Phosphor glow based on theme
  if (phosphorGlow) {
    const phosphorColors = {
      green: '0, 255, 0',
      amber: '255, 191, 0',
      blue: '0, 191, 255',
      white: '255, 255, 255'
    };
    
    const color = phosphorColors[theme] || phosphorColors.green;
    
    gradients.push(`radial-gradient(ellipse 150% 150% at center center,
      rgba(${color}, 0.02) 0%,
      rgba(${color}, 0.01) 50%,
      rgba(${color}, 0) 100%
    )`);
  }

  // Scanlines using repeating linear gradient
  if (scanlines) {
    gradients.push(`repeating-linear-gradient(
      0deg,
      transparent 0px,
      transparent 1px,
      rgba(0, 0, 0, ${scanlineOpacity}) 1px,
      rgba(0, 0, 0, ${scanlineOpacity}) 2px
    )`);
  }

  return gradients.join(', ');
}

/**
 * Generates a CRT gradient as a canvas element
 */
export function generateCRTGradientCanvas(options: CRTGradientOptions): HTMLCanvasElement {
  const { width, height, curvature = 0.3, scanlines = true, scanlineOpacity = 0.1, 
          vignette = true, vignetteIntensity = 0.4, phosphorGlow = true, 
          noiseAmount = 0.05, theme = 'green' } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Create phosphor glow
  if (phosphorGlow) {
    const phosphorColors = {
      green: [0, 255, 0],
      amber: [255, 191, 0],
      blue: [0, 191, 255],
      white: [255, 255, 255]
    };
    
    const [r, g, b] = phosphorColors[theme] || phosphorColors.green;
    
    const glowGradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    glowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.02)`);
    glowGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.01)`);
    glowGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, width, height);
  }

  // Add vignette
  if (vignette) {
    const vignetteGradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.6
    );
    vignetteGradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
    vignetteGradient.addColorStop(0.4, `rgba(0, 0, 0, 0)`);
    vignetteGradient.addColorStop(0.7, `rgba(0, 0, 0, ${vignetteIntensity * 0.3})`);
    vignetteGradient.addColorStop(1, `rgba(0, 0, 0, ${vignetteIntensity * 0.6})`);
    
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, width, height);
  }

  // Add curvature darkening
  if (curvature > 0) {
    const curvatureGradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * (1 - curvature) * 0.3,
      width / 2, height / 2, Math.min(width, height) * 0.5
    );
    curvatureGradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
    curvatureGradient.addColorStop(0.6, `rgba(0, 0, 0, ${curvature * 0.2})`);
    curvatureGradient.addColorStop(1, `rgba(0, 0, 0, ${curvature * 0.5})`);
    
    ctx.fillStyle = curvatureGradient;
    ctx.fillRect(0, 0, width, height);
  }

  // Add scanlines
  if (scanlines) {
    ctx.fillStyle = `rgba(0, 0, 0, ${scanlineOpacity})`;
    for (let y = 0; y < height; y += 2) {
      ctx.fillRect(0, y, width, 1);
    }
  }

  // Add noise
  if (noiseAmount > 0) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * noiseAmount * 255;
      data[i] += noise;     // Red
      data[i + 1] += noise; // Green
      data[i + 2] += noise; // Blue
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  return canvas;
}

/**
 * Creates a data URL for a CRT gradient
 */
export function generateCRTGradientDataURL(options: CRTGradientOptions): string {
  const canvas = generateCRTGradientCanvas(options);
  return canvas.toDataURL('image/png');
}

/**
 * Theme-specific CRT gradient presets
 */
export const CRT_THEME_PRESETS = {
  mainframe70s: {
    theme: 'green' as const,
    curvature: 0.4,
    scanlines: true,
    scanlineOpacity: 0.15,
    vignette: true,
    vignetteIntensity: 0.5,
    phosphorGlow: true,
    noiseAmount: 0.08
  },
  pc80s: {
    theme: 'amber' as const,
    curvature: 0.3,
    scanlines: true,
    scanlineOpacity: 0.12,
    vignette: true,
    vignetteIntensity: 0.4,
    phosphorGlow: true,
    noiseAmount: 0.06
  },
  bbs90s: {
    theme: 'blue' as const,
    curvature: 0.25,
    scanlines: true,
    scanlineOpacity: 0.1,
    vignette: true,
    vignetteIntensity: 0.35,
    phosphorGlow: true,
    noiseAmount: 0.04
  },
  modern: {
    theme: 'white' as const,
    curvature: 0.1,
    scanlines: false,
    scanlineOpacity: 0.05,
    vignette: true,
    vignetteIntensity: 0.2,
    phosphorGlow: false,
    noiseAmount: 0.02
  }
} as const;