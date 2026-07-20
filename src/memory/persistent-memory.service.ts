import { IPersistentMemoryRepository, MemoryRecord } from './memory.interface';
import { sqliteMemoryRepository } from './sqlite-memory.repository';

export class PersistentMemoryService {
  constructor(private readonly repo: IPersistentMemoryRepository = sqliteMemoryRepository) {}

  /**
   * Saves or updates a memory record.
   */
  public async saveMemory(
    category: string,
    key: string,
    value: string,
    importance = 3,
  ): Promise<MemoryRecord> {
    return this.repo.saveMemory({
      category: category.trim(),
      key: key.trim(),
      value: value.trim(),
      importance,
    });
  }

  /**
   * Retrieves a memory by key and optional category.
   */
  public async getMemoryByKey(key: string, category?: string): Promise<MemoryRecord | null> {
    return this.repo.getMemoryByKey(key, category);
  }

  /**
   * Retrieves all stored long-term memories.
   */
  public async getAllMemories(): Promise<MemoryRecord[]> {
    return this.repo.getAllMemories();
  }

  /**
   * Deletes a memory by ID.
   */
  public async deleteMemory(id: string): Promise<boolean> {
    return this.repo.deleteMemory(id);
  }

  /**
   * Performs keyword-based search across stored memories.
   */
  public async searchMemories(query: string): Promise<MemoryRecord[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return this.repo.searchMemories(query.trim());
  }

  /**
   * Retrieves only relevant memories matching words in the user prompt.
   * Ensures we do not inject the entire database on every request.
   *
   * @param prompt The input user query string.
   * @returns Array of relevant MemoryRecord objects.
   */
  public async getRelevantMemories(prompt: string): Promise<MemoryRecord[]> {
    if (!prompt || prompt.trim().length === 0) {
      return [];
    }

    // Stop words to ignore during prompt keyword extraction
    const stopWords = new Set([
      'what',
      'is',
      'are',
      'the',
      'do',
      'does',
      'did',
      'i',
      'my',
      'me',
      'you',
      'your',
      'a',
      'an',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'about',
      'tell',
      'ask',
      'explain',
      'who',
      'how',
      'can',
      'should',
      'would',
      'could',
      'use',
      'using',
      'have',
      'has',
      'had',
      'tell',
      'show',
      'give',
      'know',
    ]);

    const words = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !stopWords.has(w));

    if (words.length === 0) {
      return [];
    }

    const allMemories = await this.repo.getAllMemories();
    const relevant: MemoryRecord[] = [];

    for (const mem of allMemories) {
      const keyLower = mem.key.toLowerCase();
      const valLower = mem.value.toLowerCase();
      const catLower = mem.category.toLowerCase();

      const matches = words.some(
        (word) => keyLower.includes(word) || valLower.includes(word) || catLower.includes(word),
      );

      if (matches) {
        relevant.push(mem);
      }
    }

    return relevant.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Determines whether a user prompt contains long-term facts that should be persisted vs small talk/transient requests.
   *
   * @param prompt User prompt text.
   * @returns True if prompt contains long-term owner information.
   */
  public shouldRemember(prompt: string): boolean {
    const text = prompt.toLowerCase();

    // Ignore greetings, small talk, weather, one-time requests, jokes
    const ignorePatterns = [
      /\b(hello|hi|hey|good morning|good evening|goodnight)\b/,
      /\b(weather|temperature|rain|forecast)\b/,
      /\b(joke|funny|laugh)\b/,
      /\b(what time|date today|lunch|dinner|breakfast)\b/,
    ];

    if (ignorePatterns.some((pattern) => pattern.test(text))) {
      return false;
    }

    // Include personal statements and preferences
    const rememberPatterns = [
      /\bmy name is\b/,
      /\bi study\b/,
      /\bi work\b/,
      /\bmy favorite\b/,
      /\bi love\b/,
      /\bmy laptop\b/,
      /\bmy desktop\b/,
      /\bmy gpu\b/,
      /\bmy goal\b/,
      /\bmy birthday\b/,
      /\bi live in\b/,
      /\bmy degree\b/,
    ];

    return rememberPatterns.some((pattern) => pattern.test(text));
  }
}

export const persistentMemoryService = new PersistentMemoryService();
