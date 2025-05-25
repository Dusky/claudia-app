// For browser builds, we use the mock database
export { MockDatabase as ClaudiaDatabase } from './mockDatabase';
export type { 
  ConversationMessage, 
  Conversation,
  Setting,
  AvatarImageCache
} from './mockDatabase';