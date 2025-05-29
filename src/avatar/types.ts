export interface AvatarCommand {
  position?: AvatarPosition;
  expression?: AvatarExpression;
  action?: AvatarAction;
  gesture?: AvatarGesture;
  pose?: AvatarPose;
  hide?: boolean;
  show?: boolean;
  fade?: boolean;
  pulse?: boolean;
  scale?: number;
  duration?: number;
}

export type AvatarPosition = 
  | 'center' 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right'
  | 'center-left'
  | 'center-right'
  | 'top-center'
  | 'bottom-center'
  | 'beside-text'
  | 'overlay-left'
  | 'overlay-right'
  | 'floating'
  | 'peeking'
  | 'floating-left'
  | 'floating-right'
  | 'peek-left'
  | 'peek-right'
  | 'peek-top'
  | 'peek-bottom'
  | 'center-overlay'
  | 'custom';

export type AvatarExpression = 
  | 'neutral'
  | 'happy'
  | 'curious'
  | 'focused'
  | 'thinking'
  | 'surprised'
  | 'confused'
  | 'excited'
  | 'confident'
  | 'mischievous'
  | 'sleepy'
  | 'shocked';

export type AvatarAction = 
  | 'idle'
  | 'type'
  | 'search'
  | 'read'
  | 'wave'
  | 'nod'
  | 'shrug'
  | 'point'
  | 'think'
  | 'work';

export type AvatarGesture = 
  | 'point-down'
  | 'point-up'
  | 'point-left'
  | 'point-right'
  | 'thumbs-up'
  | 'wave'
  | 'peace'
  | 'ok'
  | 'shrug';

export type AvatarPose = 
  | 'standing'
  | 'sitting'
  | 'leaning'
  | 'crossed-arms'
  | 'hands-on-hips'
  | 'casual';

export interface AvatarGenerationParams {
  expression: AvatarExpression;
  pose: AvatarPose;
  action?: AvatarAction;
  style?: string;
  background?: 'transparent' | 'none' | 'cyber';
  lighting?: 'soft' | 'dramatic' | 'neon';
  quality?: 'draft' | 'standard' | 'high';
  prompt?: string; // Allow including the final compiled prompt for caching
}

export interface AvatarState {
  visible: boolean;
  expression: AvatarExpression;
  pose: AvatarPose;
  action: AvatarAction;
  gesture?: AvatarGesture;
  position?: AvatarPosition;
  customX?: number; // Custom X coordinate (0-100, percentage)
  customY?: number; // Custom Y coordinate (0-100, percentage)
  scale: number;
  opacity: number;
  imageUrl?: string;
  isAnimating: boolean;
  isGenerating: boolean;
  hasError: boolean;
  errorMessage?: string;
  lastUpdate: string;
  generationPrompt?: string;
  negativePrompt?: string;
  generationModel?: string;
  generatedAt?: string;
}

export interface CachedAvatar {
  promptHash: string;
  imageUrl: string;
  localPath?: string;
  parameters: AvatarGenerationParams;
  createdAt: string;
  accessedAt: string;
}