export type MemoryCategory =
  | 'Personal'
  | 'Preference'
  | 'Education'
  | 'Career'
  | 'Device'
  | 'Project'
  | 'Family'
  | 'Relationship'
  | 'Health'
  | 'Location'
  | 'Skill'
  | 'Goal'
  | 'Custom';

export interface MemoryRecord {
  id: string;
  category: MemoryCategory | string;
  key: string;
  value: string;
  importance: number; // 1-10 scale
  confidence: number; // 0-100 scale
  accessCount: number;
  lastAccessed: Date;
  parentId?: string | null;
  relatedIds?: string[];
  selectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryHistoryRecord {
  id: string;
  memoryId: string;
  oldValue: string;
  newValue: string;
  changedAt: Date;
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
   * Handles conflict resolution by archiving old values into history.
   * Increments confidence and access count when identical facts are confirmed.
   */
  saveMemory(
    memory: Omit<
      MemoryRecord,
      'id' | 'createdAt' | 'updatedAt' | 'lastAccessed' | 'accessCount' | 'confidence'
    > & {
      id?: string;
      confidence?: number;
      accessCount?: number;
      lastAccessed?: Date;
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

  /**
   * Updates lastAccessed and increments accessCount for a memory record.
   */
  touchMemory(id: string): Promise<void>;

  /**
   * Retrieves archived change history for a memory record.
   */
  getMemoryHistory(memoryId: string): Promise<MemoryHistoryRecord[]>;

  /**
   * Safely cleans up low-confidence and obsolete memories.
   */
  cleanupMemories(minConfidence?: number): Promise<number>;
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
