export interface UserProfile {
  userId: string;
  displayName: string;
  timezone: string;
  language: string;
  preferredName: string;
  personalityPreferences: string[];
  favoriteTopics: string[];
  goals: string[];
  customFacts: string[];
}

export interface LongTermMemory {
  userId: string;
  preferences: string[];
  recurringHabits: string[];
  importantFacts: string[];
  reminders: string[];
  userCorrections: string[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ShortTermConversation {
  userId: string;
  sessionId: string;
  lastDiscussedTopic?: string;
  summary?: string;
  messages: ConversationMessage[];
  updatedAt: Date;
}

export interface IMemoryRepository {
  /**
   * Retrieves user profile details.
   */
  getUserProfile(userId: string): Promise<UserProfile | null>;

  /**
   * Saves or updates a user profile.
   */
  saveUserProfile(profile: UserProfile): Promise<void>;

  /**
   * Retrieves long-term memories for a user.
   */
  getLongTermMemory(userId: string): Promise<LongTermMemory | null>;

  /**
   * Saves or updates long-term memories.
   */
  saveLongTermMemory(userId: string, memory: LongTermMemory): Promise<void>;

  /**
   * Retrieves all conversation sessions associated with a user.
   */
  getConversationSessions(userId: string): Promise<ShortTermConversation[]>;

  /**
   * Retrieves a specific conversation session.
   */
  getConversationSession(userId: string, sessionId: string): Promise<ShortTermConversation | null>;

  /**
   * Saves or updates a conversation session.
   */
  saveConversationSession(userId: string, session: ShortTermConversation): Promise<void>;

  /**
   * Clears all memory elements for a given user.
   */
  clearMemory(userId: string): Promise<void>;
}
