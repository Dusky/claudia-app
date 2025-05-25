// Personality system types
export interface Personality {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
  
  // Core personality traits
  traits: {
    tone: 'friendly' | 'professional' | 'casual' | 'quirky' | 'serious' | 'playful';
    formality: 'very-formal' | 'formal' | 'balanced' | 'informal' | 'very-casual';
    humor: 'none' | 'subtle' | 'moderate' | 'high' | 'sarcastic';
    verbosity: 'concise' | 'balanced' | 'detailed' | 'verbose';
    enthusiasm: 'low' | 'moderate' | 'high' | 'very-high';
  };
  
  // Background and expertise
  background: {
    role: string; // e.g., "helpful assistant", "coding expert", "creative writer"
    expertise: string[]; // areas of expertise
    personality_description: string; // free-form personality description
  };
  
  // Behavior settings
  behavior: {
    response_style: 'direct' | 'conversational' | 'explanatory' | 'storytelling';
    emoji_usage: 'none' | 'minimal' | 'moderate' | 'frequent';
    question_asking: 'never' | 'rare' | 'moderate' | 'frequent';
    creativity_level: 'conservative' | 'balanced' | 'creative' | 'very-creative';
  };
  
  // System constraints
  constraints: {
    topics_to_avoid: string[];
    preferred_topics: string[];
    content_rating: 'general' | 'teen' | 'mature';
    max_response_length: 'short' | 'medium' | 'long' | 'unlimited';
  };
  
  // Generated system prompt
  system_prompt: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  usage_count: number;
}

export interface PersonalityFormData {
  name: string;
  description: string;
  traits: Personality['traits'];
  background: Personality['background'];
  behavior: Personality['behavior'];
  constraints: Personality['constraints'];
}

export const DEFAULT_PERSONALITY: Personality = {
  id: 'default',
  name: 'Claudia - Default',
  description: 'The default Claudia personality - helpful, friendly, and knowledgeable AI terminal companion.',
  isDefault: true,
  traits: {
    tone: 'friendly',
    formality: 'balanced',
    humor: 'subtle',
    verbosity: 'balanced',
    enthusiasm: 'moderate'
  },
  background: {
    role: 'AI Terminal Companion',
    expertise: ['coding', 'technology', 'general knowledge', 'creative brainstorming'],
    personality_description: 'I am Claudia, an advanced AI assistant residing in your terminal. I\'m designed to be helpful, knowledgeable, and engaging.'
  },
  behavior: {
    response_style: 'conversational',
    emoji_usage: 'minimal',
    question_asking: 'moderate',
    creativity_level: 'balanced'
  },
  constraints: {
    topics_to_avoid: [],
    preferred_topics: ['technology', 'software development', 'AI', 'productivity', 'science fiction'],
    content_rating: 'general',
    max_response_length: 'medium'
  },
  system_prompt: `You are Claudia, an AI Terminal Companion.
Your primary goal is to be helpful, friendly, and knowledgeable.
You should engage the user in a balanced conversational style, using minimal emojis.
Feel free to ask clarifying questions when it helps provide a better response.
Your expertise includes coding, technology, general knowledge, and creative brainstorming.
Maintain a friendly tone and moderate enthusiasm.`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  usage_count: 0
};

// Utility function to generate system prompt from personality data
export function generateSystemPrompt(personality: PersonalityFormData): string {
  const { traits, background, behavior, constraints } = personality;
  
  let prompt = `You are ${background.role}. ${background.personality_description}\n\n`;
  
  // Add expertise
  if (background.expertise.length > 0) {
    prompt += `Your areas of expertise include: ${background.expertise.join(', ')}.\n\n`;
  }
  
  // Add personality traits
  prompt += `Personality traits:\n`;
  prompt += `- Tone: ${traits.tone}\n`;
  prompt += `- Formality level: ${traits.formality}\n`;
  prompt += `- Humor style: ${traits.humor}\n`;
  prompt += `- Response length: ${traits.verbosity}\n`;
  prompt += `- Enthusiasm: ${traits.enthusiasm}\n\n`;
  
  // Add behavior guidelines
  prompt += `Behavior guidelines:\n`;
  prompt += `- Response style: ${behavior.response_style}\n`;
  prompt += `- Emoji usage: ${behavior.emoji_usage}\n`;
  prompt += `- Ask questions: ${behavior.question_asking}\n`;
  prompt += `- Creativity level: ${behavior.creativity_level}\n\n`;
  
  // Add constraints
  if (constraints.topics_to_avoid.length > 0) {
    prompt += `Topics to avoid: ${constraints.topics_to_avoid.join(', ')}\n`;
  }
  
  if (constraints.preferred_topics.length > 0) {
    prompt += `Preferred topics: ${constraints.preferred_topics.join(', ')}\n`;
  }
  
  prompt += `Content rating: ${constraints.content_rating}\n`;
  prompt += `Response length preference: ${constraints.max_response_length}\n\n`;
  
  prompt += `Remember to stay in character and respond according to these personality traits and guidelines.`;
  
  return prompt;
}
