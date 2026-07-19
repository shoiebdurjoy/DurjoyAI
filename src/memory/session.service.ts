import { IMemoryRepository, ShortTermConversation, ConversationMessage } from './memory.interface';
import { memoryRepository } from './memory.repository';

export class SessionService {
  constructor(private readonly repo: IMemoryRepository = memoryRepository) {}

  /**
   * Retrieves the active conversation session details or registers a new empty session.
   */
  public async getOrCreateSession(
    userId: string,
    sessionId: string,
  ): Promise<ShortTermConversation> {
    const existing = await this.repo.getConversationSession(userId, sessionId);
    if (existing) {
      return existing;
    }

    const defaultSession: ShortTermConversation = {
      userId,
      sessionId,
      messages: [],
      updatedAt: new Date(),
    };

    await this.repo.saveConversationSession(userId, defaultSession);
    return defaultSession;
  }

  /**
   * Appends a new conversation statement (user prompt or AI response) to short-term history.
   * Limits message logging arrays to the last 20 messages to keep request payload contexts performant.
   */
  public async appendMessage(
    userId: string,
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<ShortTermConversation> {
    const session = await this.getOrCreateSession(userId, sessionId);
    const newMessage: ConversationMessage = {
      role,
      content,
      timestamp: new Date(),
    };

    session.messages.push(newMessage);
    session.updatedAt = new Date();

    // Bound array size for prompt window performance
    if (session.messages.length > 20) {
      session.messages.shift();
    }

    await this.repo.saveConversationSession(userId, session);
    return session;
  }

  /**
   * Updates metadata tags for session summaries or topic labels.
   */
  public async updateSessionMetadata(
    userId: string,
    sessionId: string,
    metadata: { lastDiscussedTopic?: string; summary?: string },
  ): Promise<ShortTermConversation> {
    const session = await this.getOrCreateSession(userId, sessionId);
    if (metadata.lastDiscussedTopic !== undefined) {
      session.lastDiscussedTopic = metadata.lastDiscussedTopic;
    }
    if (metadata.summary !== undefined) {
      session.summary = metadata.summary;
    }
    session.updatedAt = new Date();
    await this.repo.saveConversationSession(userId, session);
    return session;
  }
}

export const sessionService = new SessionService();
