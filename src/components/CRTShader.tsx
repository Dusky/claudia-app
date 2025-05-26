import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ShaderMaterial } from 'three';
import * as THREE from 'three';
import html2canvas from 'html2canvas';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D tDiffuse;
  uniform float time;
  uniform vec2 resolution;
  uniform float curvature; // Higher values = less curvature. e.g., 5.0 to 20.0. 0 or less to disable.
  uniform float scanlineDensity; // How many scanlines, e.g., resolution.y * 0.7. 0 to disable.
  uniform float scanlineIntensity; // Strength of scanlines, e.g., 0.1 to 0.5
  uniform float noiseIntensity; // Strength of noise, e.g., 0.05 to 0.2. 0 to disable.
  uniform float brightness;
  uniform float distortionAmount; // Chromatic aberration amount. 0 to disable.
  
  varying vec2 vUv;
  
  // Curve function: uv_in is 0-1. curveAmount: higher means less curve.
  vec2 curveUV(vec2 uv_in, float curveAmount) {
    if (curveAmount <= 0.0) return uv_in; // No curve if amount is zero or negative
    vec2 uv = uv_in * 2.0 - 1.0; // Remap to -1.0 to 1.0
    vec2 offset = abs(uv.yx) / curveAmount; 
    uv = uv + uv * offset * offset;
    uv = uv * 0.5 + 0.5; // Remap back to 0.0 to 1.0
    return uv;
  }
  
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;
    
    uv = curveUV(uv, curvature);
    
    // Check if we're outside the curved bounds
    // This creates a "rounded screen" effect by making pixels outside black.
    if (curvature > 0.0 && (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // Black outside
      return;
    }
    
    vec3 col = texture2D(tDiffuse, uv).rgb;
    
    // Scanlines
    if (scanlineIntensity > 0.0 && scanlineDensity > 0.0) {
      float scanlineEffect = sin(uv.y * scanlineDensity - time * 10.0); // Slower scanline animation
      scanlineEffect = (scanlineEffect * 0.5 + 0.5); // Remap to 0-1
      scanlineEffect = pow(scanlineEffect, 3.0); // Sharpen
      col = mix(col, col * (1.0 - scanlineIntensity * 0.7), scanlineEffect); // Darken for scanlines
    }
    
    // RGB shift for chromatic aberration
    if (distortionAmount > 0.0) {
      float shift = 0.001 * distortionAmount; 
      vec2 ruv = curveUV(vUv + vec2(shift, 0.0), curvature); // Re-curve shifted UVs
      vec2 buv = curveUV(vUv - vec2(shift, 0.0), curvature); // Re-curve shifted UVs

      // Check bounds for shifted UVs as well
      if (ruv.x >= 0.0 && ruv.x <= 1.0 && ruv.y >= 0.0 && ruv.y <= 1.0) {
        col.r = texture2D(tDiffuse, ruv).r;
      }
      if (buv.x >= 0.0 && buv.x <= 1.0 && buv.y >= 0.0 && buv.y <= 1.0) {
         col.b = texture2D(tDiffuse, buv).b;
      }
      // Green channel uses original 'uv' which is already bounds-checked
    }
    
    // Noise
    if (noiseIntensity > 0.0) {
      float n = random(uv + mod(time * 0.1, 1.0)); // Slightly faster noise animation
      col += (n - 0.5) * noiseIntensity; 
    }
    
    // Vignette
    float vignetteDist = distance(uv, vec2(0.5));
    float vignetteAmount = smoothstep(0.7, 0.2, vignetteDist); // Adjust for stronger/softer vignette
    col *= vignetteAmount;
    
    // Brightness
    col *= brightness;
    
    // Clamp final color
    col = clamp(col, 0.0, 1.0);
    
    gl_FragColor = vec4(col, 1.0);
  }
`;

interface CRTMeshUniforms {
  [uniform: string]: { value: any };
  tDiffuse: { value: THREE.Texture | null };
  time: { value: number };
  resolution: { value: THREE.Vector2 };
  curvature: { value: number };
  scanlineDensity: { value: number };
  scanlineIntensity: { value: number };
  noiseIntensity: { value: number };
  brightness: { value: number };
  distortionAmount: { value: number };
}

interface CRTMeshProps {
  texture: THREE.Texture | null;
  curvature?: number;
  scanlineDensity?: number;
  scanlineIntensity?: number;
  noiseIntensity?: number;
  brightness?: number;
  distortionAmount?: number;
}

function CRTMesh({ 
  texture, 
  curvature = 10.0, 
  scanlineDensity = 400.0, 
  scanlineIntensity = 0.2,
  noiseIntensity = 0.08,
  brightness = 1.1, 
  distortionAmount = 0.6 
}: CRTMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size, gl } = useThree();
  
  const uniforms = useMemo<CRTMeshUniforms>(() => ({
    tDiffuse: { value: texture },
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio()) },
    curvature: { value: curvature },
    scanlineDensity: { value: scanlineDensity },
    scanlineIntensity: { value: scanlineIntensity },
    noiseIntensity: { value: noiseIntensity },
    brightness: { value: brightness },
    distortionAmount: { value: distortionAmount }
  }), [texture, size, gl, curvature, scanlineDensity, scanlineIntensity, noiseIntensity, brightness, distortionAmount]);
  
  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });
  }, [uniforms]);

  useEffect(() => {
    if (material.uniforms.tDiffuse) {
      material.uniforms.tDiffuse.value = texture;
    }
  }, [texture, material.uniforms.tDiffuse]);

  useEffect(() => {
    if (material.uniforms.resolution) {
      material.uniforms.resolution.value.set(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio());
    }
  }, [size, gl, material.uniforms.resolution]);
  
  useFrame((state) => {
    if (material.uniforms.time) {
      material.uniforms.time.value = state.clock.elapsedTime;
    }
  });
  
  return (
    <mesh ref={meshRef} material={material}>
      <planeGeometry args={[2, 2]} /> {/* Covers the entire viewport */}
    </mesh>
  );
}

interface CRTShaderWrapperProps {
  children: React.ReactNode;
  enabled?: boolean;
  theme?: string; // Theme ID to select CRT settings
}

// Debounce function
function debounce<F extends (...args: any[]) => Promise<void>>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        func(...args).then(resolve).catch(reject);
      }, waitFor);
    });
  };
}


export function CRTShaderWrapper({ children, enabled = true, theme = 'modern' }: CRTShaderWrapperProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const [currentTextureForMesh, setCurrentTextureForMesh] = useState<THREE.CanvasTexture | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [renderError, setRenderError] = useState(false);

  // Theme-specific CRT settings
  const crtSettings = useMemo(() => {
    // Default values, adjust these as base for all themes or specific looks
    const defaults = { 
      curvature: 15.0,         // Higher = less curve. 0 or less to disable.
      scanlineDensity: 600.0,  // e.g. target height * 0.8. 0 to disable.
      scanlineIntensity: 0.15, // 0 to 1
      noiseIntensity: 0.05,    // 0 to 1. 0 to disable.
      brightness: 1.0,         // Multiplier
      distortionAmount: 0.3    // Chromatic aberration. 0 to disable.
    };
    switch (theme) {
      case 'mainframe70s':
        return { ...defaults, curvature: 12.0, scanlineDensity: 700.0, scanlineIntensity: 0.2, noiseIntensity: 0.07, brightness: 1.05, distortionAmount: 0.2 };
      case 'pc80s':
        return { ...defaults, curvature: 10.0, scanlineDensity: 500.0, scanlineIntensity: 0.18, noiseIntensity: 0.06, brightness: 1.0, distortionAmount: 0.4 };
      case 'bbs90s':
        return { ...defaults, curvature: 8.0, scanlineDensity: 450.0, scanlineIntensity: 0.12, noiseIntensity: 0.04, brightness: 1.02, distortionAmount: 0.25 };
      case 'modern':
      default:
        // Modern might have very subtle or no CRT effects from the shader, relying more on TerminalDisplay's CSS effects
        return { ...defaults, curvature: 30.0, scanlineIntensity: 0.05, noiseIntensity: 0.02, distortionAmount: 0.05, brightness: 1.0 };
    }
  }, [theme]);
  
  const debouncedCaptureAndSetTexture = useMemo(
    () =>
      debounce(async (element: HTMLDivElement) => {
        if (isCapturing || !element) return;
        setIsCapturing(true);
        try {
          const canvas = await html2canvas(element, {
            backgroundColor: null, // Important for transparency if underlying DOM has it
            allowTaint: true,
            useCORS: true,
            scale: window.devicePixelRatio || 1, // Capture at device resolution for sharpness
            logging: false, // Disable html2canvas logging in console
            scrollX: 0, 
            scrollY: 0,
            windowWidth: element.scrollWidth, // Use scrollWidth/Height for full content size
            windowHeight: element.scrollHeight,
          });
          
          const newTexture = new THREE.CanvasTexture(canvas);
          newTexture.needsUpdate = true;
          
          // Dispose old texture before assigning new one to prevent memory leaks
          if (textureRef.current && textureRef.current !== newTexture) {
            textureRef.current.dispose();
          }
          textureRef.current = newTexture;
          setCurrentTextureForMesh(newTexture); // This will trigger re-render of CRTMesh

        } catch (error) {
          console.error('CRTShader: html2canvas capture failed:', error);
          setRenderError(true); // Fallback to showing children directly
        } finally {
          setIsCapturing(false);
        }
      }, 150), // Debounce time in ms (e.g., 150-250ms). Adjust based on performance.
    [isCapturing] // isCapturing dependency ensures debounce is stable unless capture state changes
  );

  useEffect(() => {
    if (!enabled || !contentRef.current) {
      if (textureRef.current) { // Cleanup if disabled or unmounted
        textureRef.current.dispose();
        textureRef.current = null;
        setCurrentTextureForMesh(null);
      }
      return;
    }

    const currentContentElement = contentRef.current;
    
    // Initial capture
    debouncedCaptureAndSetTexture(currentContentElement);

    // Observe DOM changes to trigger re-capture
    const observer = new MutationObserver((mutationsList) => {
      // We only need to know *if* there were mutations, not what they were.
      if (mutationsList.length > 0 && currentContentElement) {
         debouncedCaptureAndSetTexture(currentContentElement);
      }
    });

    observer.observe(currentContentElement, { 
      attributes: true, 
      childList: true, 
      subtree: true, 
      characterData: true 
    });

    // Resize observer to recapture on size changes
    const resizeObserver = new ResizeObserver(() => {
      if (currentContentElement) {
        debouncedCaptureAndSetTexture(currentContentElement);
      }
    });
    resizeObserver.observe(currentContentElement);

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
        setCurrentTextureForMesh(null);
      }
    };
  }, [enabled, debouncedCaptureAndSetTexture]); 
  
  // If shader is disabled or an error occurred, just render children directly
  if (!enabled || renderError) {
    return <>{children}</>;
  }
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* This div is captured by html2canvas */}
      <div 
        ref={contentRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          // Visibility is controlled by whether the texture is ready for the overlay.
          // This prevents FOUC (Flash Of Unstyled Content) if html2canvas is slow.
          visibility: currentTextureForMesh ? 'hidden' : 'visible',
        }}
      >
        {children}
      </div>
      
      {/* The WebGL Canvas for rendering the shader effect */}
      {currentTextureForMesh && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          zIndex: 1, // Ensure it overlays the original content div
          pointerEvents: 'none', // Allows interaction with the underlying DOM
        }}>
          <Canvas 
            gl={{ 
              antialias: false, // Often false for retro pixel effects
              alpha: true,      // For transparency if shader/DOM needs it
              powerPreference: "high-performance" 
            }}
            dpr={window.devicePixelRatio || 1} // Match screen DPR for crispness
            style={{ width: '100%', height: '100%' }}
            camera={{ position: [0, 0, 1], near: 0.1, far: 2 }} // Simple ortho-like camera
            flat // Use linear color workflow, good for shaders
            frameloop="always" // Keep rendering for time-based effects in shader
          >
            <CRTMesh 
              texture={currentTextureForMesh} 
              {...crtSettings} 
              scanlineDensity={crtSettings.scanlineDensity > 0 ? (contentRef.current?.offsetHeight || 600) * 0.7 : 0} // Dynamic scanline density
            />
          </Canvas>
        </div>
      )}
    </div>
  );
}
