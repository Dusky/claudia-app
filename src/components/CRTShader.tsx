import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ShaderMaterial, PlaneGeometry } from 'three';
import * as THREE from 'three';

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
  uniform float curvature;
  uniform float scanlines;
  uniform float noise;
  uniform float brightness;
  uniform float distortion;
  
  varying vec2 vUv;
  
  vec2 curve(vec2 uv) {
    uv = (uv - 0.5) * 2.0;
    uv *= 1.1;	
    uv.x *= 1.0 + pow((abs(uv.y) / curvature), 2.0);
    uv.y *= 1.0 + pow((abs(uv.x) / curvature), 2.0);
    uv = (uv / 2.0) + 0.5;
    uv = uv * 0.92 + 0.04;
    return uv;
  }
  
  void main() {
    vec2 uv = vUv;
    
    // Apply CRT curvature
    if (curvature > 0.0) {
      uv = curve(uv);
    }
    
    // Check if we're outside the curved bounds
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    
    vec3 col = texture2D(tDiffuse, uv).rgb;
    
    // Scanlines
    if (scanlines > 0.0) {
      float scanline = sin(uv.y * resolution.y * 2.0) * 0.04 * scanlines;
      col -= scanline;
    }
    
    // RGB shift for chromatic aberration
    if (distortion > 0.0) {
      float shift = 0.002 * distortion;
      col.r = texture2D(tDiffuse, uv + vec2(shift, 0.0)).r;
      col.b = texture2D(tDiffuse, uv - vec2(shift, 0.0)).b;
    }
    
    // Noise
    if (noise > 0.0) {
      float n = fract(sin(dot(uv + time * 0.01, vec2(12.9898, 78.233))) * 43758.5453);
      col += n * 0.1 * noise;
    }
    
    // Vignette
    float vignette = distance(uv, vec2(0.5));
    vignette = 1.0 - vignette * 0.5;
    col *= vignette;
    
    // Brightness and contrast
    col *= brightness;
    col = clamp(col, 0.0, 1.0);
    
    gl_FragColor = vec4(col, 1.0);
  }
`;

interface CRTShaderProps {
  texture: THREE.Texture;
  curvature?: number;
  scanlines?: number;
  noise?: number;
  brightness?: number;
  distortion?: number;
}

function CRTMesh({ texture, curvature = 5.0, scanlines = 0.5, noise = 0.2, brightness = 1.2, distortion = 1.0 }: CRTShaderProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  
  const uniforms = useMemo(() => ({
    tDiffuse: { value: texture },
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(size.width, size.height) },
    curvature: { value: curvature },
    scanlines: { value: scanlines },
    noise: { value: noise },
    brightness: { value: brightness },
    distortion: { value: distortion }
  }), [texture, size, curvature, scanlines, noise, brightness, distortion]);
  
  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });
  }, [uniforms]);
  
  useFrame((state) => {
    if (material.uniforms.time) {
      material.uniforms.time.value = state.clock.elapsedTime;
    }
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

export function CRTShaderWrapper({ children, enabled = true, theme = 'modern' }: CRTShaderWrapperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const [renderError, setRenderError] = React.useState(false);
  
  // Theme-specific CRT settings
  const crtSettings = useMemo(() => {
    switch (theme) {
      case 'mainframe70s':
        return { curvature: 8.0, scanlines: 0.8, noise: 0.3, brightness: 1.1, distortion: 0.5 };
      case 'pc80s':
        return { curvature: 6.0, scanlines: 0.6, noise: 0.2, brightness: 1.3, distortion: 1.0 };
      case 'bbs90s':
        return { curvature: 4.0, scanlines: 0.4, noise: 0.15, brightness: 1.2, distortion: 0.8 };
      case 'modern':
      default:
        return { curvature: 2.0, scanlines: 0.2, noise: 0.1, brightness: 1.1, distortion: 0.3 };
    }
  }, [theme]);
  
  // Disable CRT shader if there's an error
  if (!enabled || renderError) {
    return <>{children}</>;
  }
  
  // For now, let's disable the shader and just return children to debug
  // We'll implement a proper canvas-to-texture system later
  console.log('CRT Shader temporarily disabled for debugging');
  return <>{children}</>;
}