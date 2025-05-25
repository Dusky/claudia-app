// For browser builds, we use the mock database
export { MockDatabase as ClaudiaDatabase } from './mockDatabase';
export type { 
  ConversationMessage, 
  Conversation,
  AppSetting as Setting,
  CachedAvatarImage as AvatarImageCache
} from './types';