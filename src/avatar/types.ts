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
  | 'beside-text'
  | 'overlay-left'
  | 'overlay-right'
  | 'floating'
  | 'peeking';

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
}

export interface AvatarState {
  visible: boolean;
  position: AvatarPosition;
  expression: AvatarExpression;
  pose: AvatarPose;
  action: AvatarAction;
  gesture?: AvatarGesture;
  scale: number;
  opacity: number;
  imageUrl?: string;
  isAnimating: boolean;
  lastUpdate: string;
}

export interface CachedAvatar {
  promptHash: string;
  imageUrl: string;
  localPath?: string;
  parameters: AvatarGenerationParams;
  createdAt: string;
  accessedAt: string;
}