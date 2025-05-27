# CRT Canvas Terminal Documentation

## Overview

The CRT Canvas Terminal is an advanced HTML5 Canvas-based terminal emulator that provides authentic retro computing visual effects. It offers a highly immersive experience with realistic CRT monitor simulation including scanlines, phosphor glow, screen curvature, and other period-accurate effects.

## Features

### ✅ **Current Implementation**
- **Hardware-Accelerated Rendering**: WebGL-based effects for smooth performance
- **Authentic CRT Effects**: Scanlines, phosphor glow, screen burn, curvature
- **Multi-Theme Support**: Era-specific visual styling
- **Accessibility Features**: Screen reader support, high contrast modes
- **Mobile Responsive**: Touch-friendly interface with mobile optimizations
- **Performance Monitoring**: Built-in FPS tracking and optimization
- **Text Rendering**: High-quality typography with CRT-style font rendering
- **Input Handling**: Full keyboard support with terminal-specific key mapping

## Architecture

### Core Components

```
src/terminal/canvas/
├── core/
│   ├── CRTCanvasTerminal.ts    # Main terminal class
│   ├── TextRenderer.ts         # Text rendering engine
│   ├── CursorRenderer.ts       # Cursor animation and display
│   ├── EffectsEngine.ts        # Visual effects system
│   ├── InputHandler.ts         # Keyboard and input management
│   ├── AccessibilityManager.ts # Screen reader and a11y support
│   ├── ScrollingAnimation.ts   # Smooth scrolling effects
│   └── TypewriterEffect.ts     # Text animation effects
├── effects/
│   ├── Scanlines.ts           # CRT scanline simulation
│   ├── PhosphorGlow.ts        # Phosphor afterglow effect
│   ├── ScreenBurn.ts          # Screen burn-in simulation
│   ├── BloomEffect.ts         # Light bloom and halo effects
│   ├── Curvature.ts           # CRT screen curvature distortion
│   └── Flicker.ts             # Vintage monitor flicker
├── utils/
│   ├── FontMetrics.ts         # Font measurement and metrics
│   ├── ColorUtils.ts          # Color space conversions
│   ├── AnimationFrame.ts      # Optimized animation loops
│   ├── PerformanceMonitor.ts  # Performance tracking
│   └── MobileSupport.ts       # Mobile device optimizations
└── types/
    └── interfaces.ts          # TypeScript interfaces
```

## Usage

### Basic Setup

```typescript
import { CRTCanvasTerminal } from './terminal/canvas';

const terminal = new CRTCanvasTerminal({
  container: document.getElementById('terminal-container'),
  theme: 'mainframe70s',
  width: 800,
  height: 600,
  enableEffects: true
});

await terminal.initialize();
```

### Configuration Options

```typescript
interface CRTCanvasConfig {
  container: HTMLElement;
  width?: number;              // Canvas width (default: auto)
  height?: number;             // Canvas height (default: auto)
  theme?: string;              // Theme ID (default: 'mainframe70s')
  enableEffects?: boolean;     // Enable CRT effects (default: true)
  accessibility?: boolean;     // Enable accessibility features (default: true)
  mobile?: boolean;           // Mobile optimizations (default: auto-detect)
  performanceMode?: 'high' | 'balanced' | 'performance'; // Quality vs performance
  debugMode?: boolean;        // Show debug info (default: false)
}
```

### Command Integration

The CRT Canvas Terminal integrates with the command system through the `/crt` command:

```bash
# Toggle CRT terminal mode
/crt toggle

# Enable/disable specific effects
/crt scanlines on
/crt glow off
/crt curvature toggle

# Performance controls
/crt performance high
/crt fps show

# Accessibility options
/crt accessibility on
/crt contrast high
```

## Visual Effects

### Scanlines
- **Purpose**: Simulates horizontal scan lines of CRT monitors
- **Implementation**: Dynamic line rendering with configurable density
- **Performance**: GPU-accelerated with minimal CPU overhead

### Phosphor Glow
- **Purpose**: Recreates phosphor afterglow effect
- **Implementation**: Multi-layer blending with temporal persistence
- **Customization**: Adjustable decay rate and intensity

### Screen Curvature
- **Purpose**: Simulates curved CRT screen surface
- **Implementation**: Vertex shader distortion mapping
- **Options**: Adjustable curvature strength and edge darkening

### Screen Burn
- **Purpose**: Simulates image retention on old monitors
- **Implementation**: Persistent overlay with gradual fade
- **Behavior**: Accumulates over time, resets on clear

### Bloom Effect
- **Purpose**: Light bleeding and halo effects around bright text
- **Implementation**: Multi-pass Gaussian blur with additive blending
- **Quality**: Configurable blur radius and intensity

## Theme Integration

### Theme-Specific Effects

Each terminal theme has optimized CRT effect presets:

#### `mainframe70s`
- **Colors**: Green phosphor (#00FF00)
- **Effects**: Strong scanlines, moderate glow
- **Font**: Monospace with slight boldness
- **Curvature**: Subtle vintage CRT curve

#### `pc80s`
- **Colors**: White/cyan on blue
- **Effects**: Crisp scanlines, minimal glow
- **Font**: Pixel-perfect bitmap fonts
- **Curvature**: Flat panel simulation

#### `bbs90s`
- **Colors**: Full 16-color palette
- **Effects**: All effects enabled
- **Font**: Classic terminal fonts
- **Extras**: Flicker, noise, enhanced bloom

#### `modern`
- **Colors**: Modern dark theme
- **Effects**: Minimal or disabled
- **Font**: Clean, high-DPI rendering
- **Style**: Flat, contemporary appearance

## Performance Optimization

### Rendering Pipeline
1. **Text Rasterization**: Characters rendered to texture atlas
2. **Composition**: Multiple render passes for effects
3. **Post-Processing**: Final effects applied via shaders
4. **Frame Limiting**: Adaptive FPS based on device capabilities

### Memory Management
- **Texture Pooling**: Reuse of GPU textures
- **Buffer Management**: Circular buffers for scrolling
- **Effect Caching**: Pre-computed effect parameters
- **Cleanup**: Automatic resource cleanup on theme changes

### Mobile Optimizations
- **Reduced Effects**: Simplified effects on mobile devices
- **Touch Handling**: Touch-to-focus and gesture support
- **Battery Awareness**: Performance scaling based on device state
- **Responsive Sizing**: Automatic scaling for different screen sizes

## Accessibility Features

### Screen Reader Support
- **Text Content**: Maintains parallel text content for screen readers
- **Navigation**: Keyboard navigation with proper focus management
- **Announcements**: ARIA live regions for dynamic content
- **Descriptions**: Alt text for visual effects and animations

### Visual Accessibility
- **High Contrast**: Alternative high-contrast color schemes
- **Text Scaling**: Respects user's font size preferences
- **Motion Control**: Respects `prefers-reduced-motion` settings
- **Color Blindness**: Colorblind-friendly palette options

### Keyboard Accessibility
- **Full Keyboard Support**: All functionality accessible via keyboard
- **Focus Indicators**: Clear visual focus indicators
- **Tab Navigation**: Logical tab order throughout interface
- **Shortcuts**: Keyboard shortcuts for common actions

## Development Guide

### Adding New Effects

1. **Create Effect Class**:
```typescript
export class MyEffect implements CRTEffect {
  name = 'myeffect';
  enabled = true;
  
  initialize(context: WebGLContext): void {
    // Setup shaders, buffers, etc.
  }
  
  render(inputTexture: WebGLTexture): WebGLTexture {
    // Apply effect and return output texture
  }
  
  cleanup(): void {
    // Clean up resources
  }
}
```

2. **Register Effect**:
```typescript
// In EffectsEngine.ts
this.effects.push(new MyEffect());
```

3. **Add Theme Support**:
```typescript
// In themes.ts
myTheme.effects = {
  // ... other effects
  myeffect: true
};
```

### Performance Profiling

Enable debug mode to access performance metrics:

```typescript
const terminal = new CRTCanvasTerminal({
  debugMode: true,
  performanceMode: 'high'
});

// Access performance data
const metrics = terminal.getPerformanceMetrics();
console.log(`FPS: ${metrics.fps}, Frame Time: ${metrics.frameTime}ms`);
```

## Integration with Main Application

### Component Integration

The CRT Canvas Terminal integrates with the main React application:

```typescript
// In TerminalDisplay.tsx
import { CRTCanvasTerminal } from './canvas';

const TerminalDisplay: React.FC<Props> = ({ theme, lines }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const terminalRef = useRef<CRTCanvasTerminal | null>(null);
  
  useEffect(() => {
    if (canvasRef.current) {
      terminalRef.current = new CRTCanvasTerminal({
        container: canvasRef.current.parentElement!,
        theme: theme.id
      });
    }
  }, []);
  
  // ... component logic
};
```

### State Management

CRT terminal state is managed through the main app store:

```typescript
// In appStore.ts
interface AppState {
  terminal: {
    crtEnabled: boolean;
    effectsEnabled: boolean;
    performanceMode: 'high' | 'balanced' | 'performance';
  };
}
```

## Future Enhancements

### Planned Features
- [ ] **Audio Integration**: Terminal beep sounds and keyboard clicks
- [ ] **Advanced Effects**: Barrel distortion, chromatic aberration
- [ ] **Recording**: Screen recording and GIF export
- [ ] **Customization**: User-configurable effect parameters
- [ ] **Themes**: Additional retro computing themes
- [ ] **Performance**: WebAssembly acceleration for complex effects

### Community Extensions
- [ ] **Plugin System**: Third-party effect plugins
- [ ] **Shader Editor**: Visual shader editing interface
- [ ] **Effect Presets**: Community-shared effect configurations
- [ ] **Hardware Support**: VR/AR terminal display modes

## Troubleshooting

### Common Issues

1. **Performance Problems**
   - Set `performanceMode: 'performance'`
   - Disable heavy effects on older devices
   - Check WebGL support in browser

2. **Visual Glitches**
   - Update graphics drivers
   - Clear browser cache
   - Check WebGL extensions support

3. **Accessibility Issues**
   - Ensure `accessibility: true` in config
   - Test with screen readers
   - Verify keyboard navigation

### Debug Commands

```bash
# Show performance metrics
/crt debug on

# Test WebGL capabilities
/crt webgl info

# Reset to default settings
/crt reset

# Export current configuration
/crt export config
```

## API Reference

### Main Classes

#### `CRTCanvasTerminal`
Main terminal class with full functionality.

#### `TextRenderer`
Handles text rasterization and font rendering.

#### `EffectsEngine`
Manages visual effects pipeline.

#### `AccessibilityManager`
Provides accessibility features and screen reader support.

### Configuration Interfaces

See `src/terminal/canvas/types/interfaces.ts` for complete type definitions.

---

The CRT Canvas Terminal provides an authentic retro computing experience while maintaining modern accessibility and performance standards. It's designed to be both nostalgic and functional for contemporary use.