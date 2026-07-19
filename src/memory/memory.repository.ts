import {
  IMemoryRepository,
  UserProfile,
  LongTermMemory,
  ShortTermConversation,
} from './memory.interface';

export class InMemoryMemoryRepository implements IMemoryRepository {
  private profiles = new Map<string, UserProfile>();
  private longTermMemories = new Map<string, LongTermMemory>();
  // Key format: `${userId}:${sessionId}`
  private conversations = new Map<string, ShortTermConversation>();

  /**
   * Retrieves user profile from memory.
   */
  public async getUserProfile(userId: string): Promise<UserProfile | null> {
    const profile = this.profiles.get(userId);
    return profile ? { ...profile } : null;
  }

  /**
   * Saves user profile clone in memory.
   */
  public async saveUserProfile(profile: UserProfile): Promise<void> {
    this.profiles.set(profile.userId, { ...profile });
  }

  /**
   * Retrieves long-term memory elements from memory.
   */
  public async getLongTermMemory(userId: string): Promise<LongTermMemory | null> {
    const memory = this.longTermMemories.get(userId);
    return memory ? { ...memory } : null;
  }

  /**
   * Saves long-term memory clone in memory.
   */
  public async saveLongTermMemory(userId: string, memory: LongTermMemory): Promise<void> {
    this.longTermMemories.set(userId, { ...memory });
  }

  /**
   * Retrieves all conversation sessions sorted by updatedAt descending.
   */
  public async getConversationSessions(userId: string): Promise<ShortTermConversation[]> {
    const list: ShortTermConversation[] = [];
    for (const [key, value] of this.conversations.entries()) {
      if (key.startsWith(`${userId}:`)) {
        list.push({
          ...value,
          messages: value.messages.map((m) => ({ ...m })),
        });
      }
    }
    return list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Retrieves a specific conversation session from memory.
   */
  public async getConversationSession(
    userId: string,
    sessionId: string,
  ): Promise<ShortTermConversation | null> {
    const key = `${userId}:${sessionId}`;
    const session = this.conversations.get(key);
    return session
      ? {
          ...session,
          messages: session.messages.map((m) => ({ ...m })),
        }
      : null;
  }

  /**
   * Saves a conversation session clone in memory.
   */
  public async saveConversationSession(
    userId: string,
    session: ShortTermConversation,
  ): Promise<void> {
    const key = `${userId}:${session.sessionId}`;
    this.conversations.set(key, {
      ...session,
      messages: session.messages.map((m) => ({ ...m })),
    });
  }

  /**
   * Deletes all entries mapped to the given userId.
   */
  public async clearMemory(userId: string): Promise<void> {
    this.profiles.delete(userId);
    this.longTermMemories.delete(userId);
    for (const key of this.conversations.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.conversations.delete(key);
      }
    }
  }
}

export const memoryRepository = new InMemoryMemoryRepository();
