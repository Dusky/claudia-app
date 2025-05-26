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
  uniform float curvature; // Higher values = less curvature. e.g., 5.0 to 30.0. 0 or less to disable.
  uniform float scanlineDensity; // How many scanlines. e.g., resolution.y * 0.7. 0 to disable.
  uniform float scanlineIntensity; // Strength of scanlines, e.g., 0.05 to 0.3
  uniform float noiseIntensity; // Strength of noise, e.g., 0.02 to 0.15. 0 to disable.
  uniform float brightness;
  uniform float distortionAmount; // Chromatic aberration amount. 0 to disable.
  uniform float vignetteStrength; // How strong the vignette is, e.g., 0.5 to 1.5
  uniform float vignetteSmoothness; // How soft the vignette edge is, e.g., 0.2 to 0.8
  
  varying vec2 vUv;
  
  vec2 curveUV(vec2 uv_in, float curveAmount) {
    if (curveAmount <= 0.001) return uv_in; // Effectively no curve
    vec2 uv = uv_in * 2.0 - 1.0; 
    vec2 offset = abs(uv.yx) / curveAmount; 
    uv = uv + uv * offset * offset;
    uv = uv * 0.5 + 0.5; 
    return uv;
  }
  
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;
    
    uv = curveUV(uv, curvature);
    
    if (curvature > 0.001 && (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); 
      return;
    }
    
    vec3 col = texture2D(tDiffuse, uv).rgb;
    
    // Scanlines
    if (scanlineIntensity > 0.0 && scanlineDensity > 0.0) {
      // Use resolution.y to make scanline density somewhat consistent across screen sizes
      float actualScanlineDensity = scanlineDensity * (resolution.y / 1000.0); // Normalize density
      float scanlineEffect = sin(uv.y * actualScanlineDensity - time * 5.0); // Slower animation
      scanlineEffect = smoothstep(0.0, 1.0, pow(scanlineEffect * 0.5 + 0.5, 2.5)); // Sharper, more defined lines
      col = mix(col, col * (1.0 - scanlineIntensity), scanlineEffect); // Darken for scanlines
    }
    
    // RGB shift for chromatic aberration
    if (distortionAmount > 0.001) {
      float shift = 0.0015 * distortionAmount; 
      vec2 ruv = curveUV(vUv + vec2(shift, 0.0), curvature); 
      vec2 buv = curveUV(vUv - vec2(shift, 0.0), curvature);

      if (ruv.x >= 0.0 && ruv.x <= 1.0 && ruv.y >= 0.0 && ruv.y <= 1.0) {
        col.r = texture2D(tDiffuse, ruv).r;
      }
      if (buv.x >= 0.0 && buv.x <= 1.0 && buv.y >= 0.0 && buv.y <= 1.0) {
         col.b = texture2D(tDiffuse, buv).b;
      }
    }
    
    // Noise
    if (noiseIntensity > 0.001) {
      float n = random(uv + mod(time * 0.08, 1.0)); 
      col += (n - 0.5) * noiseIntensity; 
    }
    
    // Vignette
    if (vignetteStrength > 0.0) {
      float vignetteDist = distance(uv, vec2(0.5));
      // vignetteSmoothness: 0.1 (hard edge) to 0.8 (very soft edge)
      // vignetteStrength: affects how dark the edges get
      float vig = smoothstep(vignetteSmoothness, 0.2, vignetteDist); 
      col *= mix(1.0, vig, vignetteStrength);
    }
    
    col *= brightness;
    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

interface CRTMeshUniforms {
  [uniform: string]: { value: any }; // Allow arbitrary uniforms
  tDiffuse: { value: THREE.Texture | null };
  time: { value: number };
  resolution: { value: THREE.Vector2 };
  curvature: { value: number };
  scanlineDensity: { value: number };
  scanlineIntensity: { value: number };
  noiseIntensity: { value: number };
  brightness: { value: number };
  distortionAmount: { value: number };
  vignetteStrength: { value: number };
  vignetteSmoothness: { value: number };
}

interface CRTMeshProps {
  texture: THREE.Texture | null;
  curvature?: number;
  scanlineDensity?: number;
  scanlineIntensity?: number;
  noiseIntensity?: number;
  brightness?: number;
  distortionAmount?: number;
  vignetteStrength?: number;
  vignetteSmoothness?: number;
}

function CRTMesh({ 
  texture, 
  curvature = 15.0, 
  scanlineDensity = 700.0, 
  scanlineIntensity = 0.1,
  noiseIntensity = 0.05,
  brightness = 1.0, 
  distortionAmount = 0.3,
  vignetteStrength = 1.0,
  vignetteSmoothness = 0.5,
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
    distortionAmount: { value: distortionAmount },
    vignetteStrength: { value: vignetteStrength },
    vignetteSmoothness: { value: vignetteSmoothness },
  }), [texture, size, gl, curvature, scanlineDensity, scanlineIntensity, noiseIntensity, brightness, distortionAmount, vignetteStrength, vignetteSmoothness]);
  
  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });
  }, [uniforms]);

  useEffect(() => {
    material.uniforms.tDiffuse.value = texture;
  }, [texture, material.uniforms.tDiffuse]);

  useEffect(() => {
    material.uniforms.resolution.value.set(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio());
  }, [size, gl, material.uniforms.resolution]);
  
  useFrame((state) => {
    material.uniforms.time.value = state.clock.elapsedTime;
  });
  
  return (
    <mesh ref={meshRef} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

interface CRTShaderWrapperProps {
  children: React.ReactNode;
  enabled?: boolean;
  theme?: string;
}

function debounce<F extends (...args: any[]) => Promise<void>>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (timeout) clearTimeout(timeout);
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

  const crtSettings = useMemo(() => {
    const defaults = { 
      curvature: 20.0, scanlineDensity: 800.0, scanlineIntensity: 0.0, 
      noiseIntensity: 0.0, brightness: 1.0, distortionAmount: 0.0,
      vignetteStrength: 0.0, vignetteSmoothness: 0.5 
    };
    switch (theme) {
      case 'mainframe70s':
        return { 
          ...defaults, curvature: 10.0, scanlineDensity: 600.0, scanlineIntensity: 0.18, 
          noiseIntensity: 0.06, brightness: 1.1, distortionAmount: 0.1,
          vignetteStrength: 1.2, vignetteSmoothness: 0.4 
        };
      case 'pc80s':
        return { 
          ...defaults, curvature: 12.0, scanlineDensity: 700.0, scanlineIntensity: 0.12, 
          noiseIntensity: 0.04, brightness: 1.0, distortionAmount: 0.25,
          vignetteStrength: 1.0, vignetteSmoothness: 0.5
        };
      case 'bbs90s':
        return { 
          ...defaults, curvature: 15.0, scanlineDensity: 750.0, scanlineIntensity: 0.10, 
          noiseIntensity: 0.08, brightness: 1.05, distortionAmount: 0.4,
          vignetteStrength: 0.8, vignetteSmoothness: 0.6
        };
      case 'modern':
      default:
        return { // Minimal effects for modern, mostly relying on CSS if any
          ...defaults, curvature: 0.0, scanlineIntensity: 0.0, 
          noiseIntensity: 0.01, distortionAmount: 0.0, vignetteStrength: 0.2, vignetteSmoothness: 0.7, brightness: 1.0
        };
    }
  }, [theme]);
  
  const debouncedCaptureAndSetTexture = useMemo(
    () =>
      debounce(async (element: HTMLDivElement) => {
        if (isCapturing || !element) return;
        setIsCapturing(true);
        try {
          const canvas = await html2canvas(element, {
            backgroundColor: null, allowTaint: true, useCORS: true,
            scale: window.devicePixelRatio || 1, logging: false,
            scrollX: 0, scrollY: 0,
            windowWidth: element.scrollWidth, windowHeight: element.scrollHeight,
          });
          const newTexture = new THREE.CanvasTexture(canvas);
          newTexture.needsUpdate = true;
          if (textureRef.current && textureRef.current !== newTexture) {
            textureRef.current.dispose();
          }
          textureRef.current = newTexture;
          setCurrentTextureForMesh(newTexture);
        } catch (error) {
          console.error('CRTShader: html2canvas capture failed:', error);
          setRenderError(true);
        } finally {
          setIsCapturing(false);
        }
      }, 180), 
    [isCapturing]
  );

  useEffect(() => {
    if (!enabled || !contentRef.current) {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
        setCurrentTextureForMesh(null);
      }
      return;
    }
    const currentContentElement = contentRef.current;
    debouncedCaptureAndSetTexture(currentContentElement);
    const observer = new MutationObserver((mutationsList) => {
      if (mutationsList.length > 0 && currentContentElement) {
         debouncedCaptureAndSetTexture(currentContentElement);
      }
    });
    observer.observe(currentContentElement, { 
      attributes: true, childList: true, subtree: true, characterData: true 
    });
    const resizeObserver = new ResizeObserver(() => {
      if (currentContentElement) debouncedCaptureAndSetTexture(currentContentElement);
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
  
  if (!enabled || renderError) {
    return <>{children}</>;
  }
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div 
        ref={contentRef} 
        style={{ 
          width: '100%', height: '100%',
          visibility: currentTextureForMesh ? 'hidden' : 'visible',
        }}
      >
        {children}
      </div>
      {currentTextureForMesh && (
        <div style={{ 
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
          zIndex: 1, pointerEvents: 'none',
        }}>
          <Canvas 
            gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
            dpr={window.devicePixelRatio || 1}
            style={{ width: '100%', height: '100%' }}
            camera={{ position: [0, 0, 1], near: 0.1, far: 2 }}
            flat frameloop="always"
          >
            <CRTMesh 
              texture={currentTextureForMesh} 
              {...crtSettings} 
              // Dynamic scanline density based on actual rendered height for consistency
              scanlineDensity={
                crtSettings.scanlineDensity > 0 && contentRef.current 
                ? crtSettings.scanlineDensity * (contentRef.current.offsetHeight / 1000.0) 
                : 0
              }
            />
          </Canvas>
        </div>
      )}
    </div>
  );
}
