import { IMemoryRepository, LongTermMemory } from './memory.interface';
import { memoryRepository } from './memory.repository';

export class MemoryService {
  constructor(private readonly repo: IMemoryRepository = memoryRepository) {}

  /**
   * Retrieves long-term memories for a user or instantiates a new default record.
   */
  public async getOrCreateLongTermMemory(userId: string): Promise<LongTermMemory> {
    const existing = await this.repo.getLongTermMemory(userId);
    if (existing) {
      return existing;
    }

    const defaultMemory: LongTermMemory = {
      userId,
      preferences: [],
      recurringHabits: [],
      importantFacts: [],
      reminders: [],
      userCorrections: [],
    };

    await this.repo.saveLongTermMemory(userId, defaultMemory);
    return defaultMemory;
  }

  /**
   * Appends a user preference (e.g. "I prefer short answers").
   */
  public async addPreference(userId: string, preference: string): Promise<LongTermMemory> {
    const memory = await this.getOrCreateLongTermMemory(userId);
    if (!memory.preferences.includes(preference)) {
      memory.preferences.push(preference);
      await this.repo.saveLongTermMemory(userId, memory);
    }
    return memory;
  }

  /**
   * Appends a user habit (e.g. "I usually wake up at 8 AM").
   */
  public async addHabit(userId: string, habit: string): Promise<LongTermMemory> {
    const memory = await this.getOrCreateLongTermMemory(userId);
    if (!memory.recurringHabits.includes(habit)) {
      memory.recurringHabits.push(habit);
      await this.repo.saveLongTermMemory(userId, memory);
    }
    return memory;
  }

  /**
   * Appends an important fact about the user (e.g. "I'm a Computer Science student").
   */
  public async addFact(userId: string, fact: string): Promise<LongTermMemory> {
    const memory = await this.getOrCreateLongTermMemory(userId);
    if (!memory.importantFacts.includes(fact)) {
      memory.importantFacts.push(fact);
      await this.repo.saveLongTermMemory(userId, memory);
    }
    return memory;
  }

  /**
   * Appends a reminder or note.
   */
  public async addReminder(userId: string, reminder: string): Promise<LongTermMemory> {
    const memory = await this.getOrCreateLongTermMemory(userId);
    if (!memory.reminders.includes(reminder)) {
      memory.reminders.push(reminder);
      await this.repo.saveLongTermMemory(userId, memory);
    }
    return memory;
  }

  /**
   * Appends a user correction (e.g. "Don't call me user, my name is Shoieb").
   */
  public async addUserCorrection(userId: string, correction: string): Promise<LongTermMemory> {
    const memory = await this.getOrCreateLongTermMemory(userId);
    if (!memory.userCorrections.includes(correction)) {
      memory.userCorrections.push(correction);
      await this.repo.saveLongTermMemory(userId, memory);
    }
    return memory;
  }

  /**
   * Compiles the user's long-term memory context details into a structured string block.
   *
   * @param userId The unique user identifier
   * @returns A parsed text string representing memory contexts.
   */
  public async getContextSummary(userId: string): Promise<string> {
    const memory = await this.getOrCreateLongTermMemory(userId);
    const facts = memory.importantFacts.join(', ');
    const habits = memory.recurringHabits.join(', ');
    const prefs = memory.preferences.join(', ');

    let summary = `Long-term context for user:\n`;
    if (facts) summary += `- Facts: ${facts}\n`;
    if (habits) summary += `- Habits: ${habits}\n`;
    if (prefs) summary += `- Preferences: ${prefs}\n`;

    return summary;
  }
}

export const memoryService = new MemoryService();
