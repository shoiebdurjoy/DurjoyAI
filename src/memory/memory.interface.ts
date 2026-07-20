export interface MemoryRecord {
  id: string;
  category: string;
  key: string;
  value: string;
  importance: number;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPersistentMemoryRepository {
  /**
   * Initializes database table structure automatically.
   */
  initialize(): Promise<void>;

  /**
   * Retrieves all memory records.
   */
  getAllMemories(): Promise<MemoryRecord[]>;

  /**
   * Retrieves a memory record by key and optional category.
   */
  getMemoryByKey(key: string, category?: string): Promise<MemoryRecord | null>;

  /**
   * Saves or updates a memory record.
   * If a record with matching key & category exists, updates it instead of duplicating.
   * Increments confidence if the value matches the existing record.
   */
  saveMemory(
    memory: Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt' | 'confidence'> & {
      id?: string;
      confidence?: number;
    },
  ): Promise<MemoryRecord>;

  /**
   * Deletes a memory record by ID.
   */
  deleteMemory(id: string): Promise<boolean>;

  /**
   * Keyword-based search across category, key, and value fields.
   */
  searchMemories(query: string): Promise<MemoryRecord[]>;
}

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
  getUserProfile(userId: string): Promise<UserProfile | null>;
  saveUserProfile(profile: UserProfile): Promise<void>;
  getLongTermMemory(userId: string): Promise<LongTermMemory | null>;
  saveLongTermMemory(userId: string, memory: LongTermMemory): Promise<void>;
  getConversationSessions(userId: string): Promise<ShortTermConversation[]>;
  getConversationSession(userId: string, sessionId: string): Promise<ShortTermConversation | null>;
  saveConversationSession(userId: string, session: ShortTermConversation): Promise<void>;
  clearMemory(userId: string): Promise<void>;
}
