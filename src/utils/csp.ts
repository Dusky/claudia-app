/**
 * Content Security Policy utilities for XSS protection
 */

/**
 * CSP directives for the application
 */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for React development
    "'unsafe-eval'", // Required for Vite development
    'https://api.anthropic.com',
    'https://api.replicate.com',
    'https://generativelanguage.googleapis.com'
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'" // Required for styled components
  ],
  'img-src': [
    "'self'",
    'data:', // For base64 images
    'blob:', // For generated images
    'https:', // For external image providers
    'https://replicate.delivery',
    'https://pbxt.replicate.delivery',
    'https://generativelanguage.googleapis.com'
  ],
  'font-src': [
    "'self'",
    'data:'
  ],
  'connect-src': [
    "'self'",
    'https://api.anthropic.com',
    'https://api.replicate.com', 
    'https://generativelanguage.googleapis.com',
    'https://api.openai.com',
    'ws://localhost:*', // For development
    'wss://localhost:*' // For development WebSockets
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"]
} as const;

/**
 * Generate CSP header string
 */
export const generateCSPHeader = (isDevelopment: boolean = false): string => {
  const directives: Record<string, string[]> = {};
  
  // Copy directives to make them mutable
  for (const [key, value] of Object.entries(CSP_DIRECTIVES)) {
    directives[key] = [...value];
  }
  
  if (isDevelopment) {
    // Add development-specific sources
    directives['connect-src'].push('ws://localhost:*', 'http://localhost:*');
  } else {
    // Production CSP - remove unsafe directives
    directives['script-src'] = directives['script-src'].filter(
      src => src !== "'unsafe-eval'"
    );
  }
  
  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
};

/**
 * Apply CSP via meta tag (fallback for environments without server control)
 */
export const applyCSPMeta = (): void => {
  const isDev = import.meta.env.DEV;
  const cspContent = generateCSPHeader(isDev);
  
  // Remove existing CSP meta tag if any
  const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existingMeta) {
    existingMeta.remove();
  }
  
  // Add new CSP meta tag
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = cspContent;
  document.head.appendChild(meta);
  
  console.log('Applied CSP:', cspContent);
};

/**
 * Validate if a URL is allowed by CSP
 */
export const isUrlAllowedByCSP = (url: string, directive: keyof typeof CSP_DIRECTIVES): boolean => {
  const sources = CSP_DIRECTIVES[directive];
  
  // Check for exact matches
  if ((sources as readonly string[]).includes("'self'") && (url.startsWith('/') || url.startsWith('./'))) {
    return true;
  }
  
  // Check for domain matches
  for (const source of sources) {
    if (source.startsWith('https://') && url.startsWith(source)) {
      return true;
    }
    if (source === 'https:' && url.startsWith('https://')) {
      return true;
    }
    if (source === 'data:' && url.startsWith('data:')) {
      return true;
    }
    if (source === 'blob:' && url.startsWith('blob:')) {
      return true;
    }
  }
  
  return false;
};

/**
 * Security headers for fetch requests
 */
export const getSecurityHeaders = (): Record<string, string> => {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
};

// Store reference to original fetch before overriding
const originalFetch = globalThis.fetch;

/**
 * Secure fetch wrapper that applies security headers
 */
export const secureFetch = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  // Validate URL against CSP
  if (!isUrlAllowedByCSP(url, 'connect-src')) {
    throw new Error(`URL not allowed by CSP: ${url}`);
  }
  
  // Apply security headers
  const secureOptions: RequestInit = {
    ...options,
    headers: {
      ...getSecurityHeaders(),
      ...options.headers
    }
  };
  
  return originalFetch(url, secureOptions);
};

/**
 * Initialize security measures
 */
export const initializeSecurity = (): void => {
  // Apply CSP
  applyCSPMeta();
  
  // Override fetch globally to use secure fetch  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof URL ? input.href : 
                typeof input === 'string' ? input : input.url;
    
    // Use secure fetch for external URLs
    if (url.startsWith('http')) {
      return secureFetch(url, init);
    }
    
    // Use original fetch for relative URLs
    return originalFetch(input, init);
  };
  
  console.log('🔒 Security measures initialized');
};