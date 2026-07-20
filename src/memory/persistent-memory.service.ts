import { IPersistentMemoryRepository, MemoryRecord, MemoryHistoryRecord } from './memory.interface';
import { sqliteMemoryRepository } from './sqlite-memory.repository';

export class PersistentMemoryService {
  constructor(private readonly repo: IPersistentMemoryRepository = sqliteMemoryRepository) {}

  /**
   * Saves or updates a memory record.
   * If an existing key/category is updated with a new value, archives previous value into history.
   */
  public async saveMemory(
    category: string,
    key: string,
    value: string,
    importance = 5,
    parentId?: string,
    relatedIds?: string[],
  ): Promise<MemoryRecord> {
    return this.repo.saveMemory({
      category: category.trim(),
      key: key.trim(),
      value: value.trim(),
      importance,
      parentId,
      relatedIds,
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
   * Retrieves archived conflict-resolution change history for a memory record.
   */
  public async getMemoryHistory(memoryId: string): Promise<MemoryHistoryRecord[]> {
    return this.repo.getMemoryHistory(memoryId);
  }

  /**
   * Safely cleans up low-confidence and obsolete memories.
   */
  public async cleanupMemories(minConfidence = 10): Promise<number> {
    return this.repo.cleanupMemories(minConfidence);
  }

  /**
   * Smart Retrieval Ranking algorithm for Brain 2.
   * Ranks candidate memories using Importance (30%), Confidence (20%), Keyword Relevance (30%), and Recency/Usage (20%).
   * Automatically groups linked relationship memories (parentId / relatedIds) and tracks internal selection reasoning.
   *
   * @param prompt The input user query string.
   * @param limit Maximum top memories to return (default 5).
   * @returns Array of ranked MemoryRecord objects with annotated internal selection reasoning.
   */
  public async getRelevantMemories(prompt: string, limit = 5): Promise<MemoryRecord[]> {
    if (!prompt || prompt.trim().length === 0) {
      return [];
    }

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
      'show',
      'give',
      'know',
      'where',
    ]);

    const synonymMap: Record<string, string[]> = {
      study: ['education', 'university', 'school', 'degree', 'major'],
      work: ['career', 'occupation', 'job'],
      laptop: ['device', 'hardware', 'gpu', 'ram'],
      club: ['sports', 'football', 'preference'],
    };

    const rawWords = prompt
      .toLowerCase()
      .replace(/[^a-z0-9_\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !stopWords.has(w));

    if (rawWords.length === 0) {
      return [];
    }

    const wordsSet = new Set<string>(rawWords);
    rawWords.forEach((w) => {
      if (synonymMap[w]) {
        synonymMap[w].forEach((syn) => wordsSet.add(syn));
      }
    });

    const searchWords = Array.from(wordsSet);
    const allMemories = await this.repo.getAllMemories();
    const scored: Array<{ memory: MemoryRecord; rankScore: number }> = [];

    const now = Date.now();

    for (const mem of allMemories) {
      const keyLower = mem.key.toLowerCase();
      const valLower = mem.value.toLowerCase();
      const catLower = mem.category.toLowerCase();

      let matchCount = 0;
      searchWords.forEach((word) => {
        if (keyLower.includes(word)) matchCount += 3;
        else if (valLower.includes(word)) matchCount += 2;
        else if (catLower.includes(word)) matchCount += 1;
      });

      if (matchCount > 0) {
        // Importance score (0-30)
        const importanceScore = (mem.importance / 10) * 30;

        // Confidence score (0-20)
        const confidenceScore = (mem.confidence / 100) * 20;

        // Keyword relevance score (0-30)
        const relevanceScore = Math.min(30, matchCount * 10);

        // Recency & Access count score (0-20)
        const ageHours = (now - mem.lastAccessed.getTime()) / (1000 * 3600);
        const recencyScore = Math.max(0, 20 - ageHours / 24) + Math.min(5, mem.accessCount);

        const rankScore = importanceScore + confidenceScore + relevanceScore + recencyScore;

        const reason = `Matched keywords [${searchWords.join(', ')}] (Score: ${rankScore.toFixed(1)} | Imp: ${mem.importance}/10, Conf: ${mem.confidence.toFixed(0)}%, Access: ${mem.accessCount})`;

        const annotatedMem: MemoryRecord = {
          ...mem,
          selectionReason: reason,
        };

        scored.push({ memory: annotatedMem, rankScore });

        // Asynchronously update access count and lastAccessed in background
        this.repo.touchMemory(mem.id).catch(() => {});
      }
    }

    // Sort by composite rank score descending
    scored.sort((a, b) => b.rankScore - a.rankScore);

    const topMemories = scored.slice(0, limit).map((s) => s.memory);

    // Expand relationships: attach child/linked memories if present
    const memoryMap = new Map<string, MemoryRecord>();
    topMemories.forEach((m) => memoryMap.set(m.id, m));

    for (const parentMem of topMemories) {
      if (parentMem.relatedIds && parentMem.relatedIds.length > 0) {
        for (const relatedId of parentMem.relatedIds) {
          if (!memoryMap.has(relatedId)) {
            const child = allMemories.find((m) => m.id === relatedId);
            if (child) {
              memoryMap.set(child.id, {
                ...child,
                selectionReason: `Linked to related parent memory '${parentMem.key}'`,
              });
            }
          }
        }
      }
    }

    return Array.from(memoryMap.values());
  }

  /**
   * Determines whether a user prompt contains long-term facts that should be persisted vs small talk/transient requests.
   *
   * @param prompt User prompt text.
   * @returns True if prompt contains long-term owner information.
   */
  public shouldRemember(prompt: string): boolean {
    const text = prompt.toLowerCase();

    const ignorePatterns = [
      /\b(hello|hi|hey|good morning|good evening|goodnight)\b/,
      /\b(weather|temperature|rain|forecast)\b/,
      /\b(joke|funny|laugh)\b/,
      /\b(what time|date today|lunch|dinner|breakfast)\b/,
    ];

    if (ignorePatterns.some((pattern) => pattern.test(text))) {
      return false;
    }

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
