import { persistentMemoryService, PersistentMemoryService } from './persistent-memory.service';
import { MemoryRecord, MemoryCategory } from './memory.interface';
import { Logger } from '../utils/logger';

export interface ExtractedFact {
  shouldRemember: boolean;
  category?: MemoryCategory | string;
  key?: string;
  value?: string;
  importance?: number;
  parentId?: string;
  relatedIds?: string[];
}

export class MemoryExtractorService {
  constructor(private readonly memoryService: PersistentMemoryService = persistentMemoryService) {}

  /**
   * Processes an AI response text to find any embedded [MEMORY_ACTION: Category|Key|Value] tags,
   * performs the upsert memory action in SQLite, and returns the clean speech text with tags removed.
   *
   * @param aiResponse Raw AI response text from LLM provider
   * @returns Clean speech text ready for voice output
   */
  public async processMemoryActionTags(aiResponse: string): Promise<string> {
    if (!aiResponse || aiResponse.trim().length === 0) {
      return aiResponse;
    }

    const tagRegex = /\[MEMORY_ACTION:\s*([^|]+)\|([^|]+)\|([^\]]+)\]/gi;
    let cleanText = aiResponse;
    let match;

    while ((match = tagRegex.exec(aiResponse)) !== null) {
      const category = match[1].trim();
      const key = match[2].trim();
      const value = match[3].trim();

      Logger.info(
        'MemoryExtractorService',
        `Upserting memory record from LLM tag | Category: "${category}" | Key: "${key}" | Value: "${value}"`,
      );

      await this.memoryService.saveMemory(category, key, value, 8);
    }

    cleanText = cleanText.replace(tagRegex, '').trim();
    return cleanText;
  }

  /**
   * Analyzes a user message to extract permanent long-term personal facts,
   * automatically saving or updating memories without explicit "remember this" commands.
   *
   * @param prompt User message string
   * @returns Resolved MemoryRecord if a fact was learned/updated, or null if ignored.
   */
  public async analyzeAndSave(prompt: string): Promise<MemoryRecord | null> {
    const extracted = this.extractFact(prompt);
    if (
      !extracted ||
      !extracted.shouldRemember ||
      !extracted.category ||
      !extracted.key ||
      !extracted.value
    ) {
      return null;
    }

    Logger.info(
      'MemoryExtractorService',
      `Auto-extracted fact | Category: "${extracted.category}" | Key: "${extracted.key}" | Value: "${extracted.value}"`,
    );

    return this.memoryService.saveMemory(
      extracted.category,
      extracted.key,
      extracted.value,
      extracted.importance ?? 5,
      extracted.parentId,
      extracted.relatedIds,
    );
  }

  /**
   * Rule-based and pattern-assisted fact extraction parser.
   * Decides if a statement contains long-term owner details (category, key, value, importance).
   *
   * @param prompt Input user prompt
   * @returns Structured ExtractedFact object or null
   */
  public extractFact(prompt: string): ExtractedFact | null {
    if (!prompt || prompt.trim().length === 0) {
      return { shouldRemember: false };
    }

    const text = prompt.trim();

    // Ignore greetings, weather, small talk, jokes, lunch, thanks, insults
    if (!this.memoryService.shouldRemember(text)) {
      return { shouldRemember: false };
    }

    // 1. Favorite Club / Sport Team (Preference)
    const favClubMatch =
      text.match(/my favorite (football |soccer |sports )?club is (.+)/i) ||
      text.match(/my favorite team is (.+)/i);
    if (favClubMatch) {
      return {
        shouldRemember: true,
        category: 'Preference',
        key: 'Favorite Football Club',
        value: favClubMatch[2].replace(/[.!]$/, '').trim(),
        importance: 8,
      };
    }

    // 2. Education & Major (Education)
    const eduMatch = text.match(/i study (.+?) at (.+)/i) || text.match(/i am a student at (.+)/i);
    if (eduMatch) {
      return {
        shouldRemember: true,
        category: 'Education',
        key: 'University',
        value: eduMatch[2].replace(/[.!]$/, '').trim(),
        importance: 9,
      };
    }

    // 3. Hardware / Device / GPU (Device)
    const gpuMatch =
      text.match(/i bought a new (RTX \d+|GTX \d+|GPU|graphics card:? (.+))/i) ||
      text.match(/my (desktop|pc|computer|gpu) (has|is) (an? )?(.+)/i);
    if (gpuMatch) {
      const val = gpuMatch[4] || gpuMatch[1];
      return {
        shouldRemember: true,
        category: 'Device',
        key: 'GPU',
        value: val.replace(/[.!]$/, '').trim(),
        importance: 7,
      };
    }

    // 4. Laptop (Device)
    const laptopMatch =
      text.match(/i (bought|have|use) a new laptop:? (.+)/i) ||
      text.match(/my laptop is (an? )?(.+)/i);
    if (laptopMatch) {
      return {
        shouldRemember: true,
        category: 'Device',
        key: 'Laptop',
        value: laptopMatch[2].replace(/[.!]$/, '').trim(),
        importance: 8,
      };
    }

    // 5. Work / Career / Office (Career / Location)
    const officeMatch = text.match(/my office is in (.+)/i) || text.match(/i work at (.+)/i);
    if (officeMatch) {
      return {
        shouldRemember: true,
        category: 'Career',
        key: 'Office Location',
        value: officeMatch[1].replace(/[.!]$/, '').trim(),
        importance: 8,
      };
    }

    const workMatch = text.match(/i work as (an? )?(.+)/i) || text.match(/my job is (an? )?(.+)/i);
    if (workMatch) {
      return {
        shouldRemember: true,
        category: 'Career',
        key: 'Occupation',
        value: workMatch[2].replace(/[.!]$/, '').trim(),
        importance: 9,
      };
    }

    // 6. Food & Personal Preferences
    const foodHateMatch = text.match(/i (hate|dislike|don't like) (.+)/i);
    if (foodHateMatch) {
      return {
        shouldRemember: true,
        category: 'Preference',
        key: `Dislike ${foodHateMatch[2].trim()}`,
        value: `Dislikes ${foodHateMatch[2].replace(/[.!]$/, '').trim()}`,
        importance: 7,
      };
    }

    // 7. Generic Favorite (Preference)
    const genFavMatch = text.match(/my favorite ([a-z\s]+) is (.+)/i);
    if (genFavMatch) {
      const key = genFavMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        shouldRemember: true,
        category: 'Preference',
        key: `Favorite ${key}`,
        value: genFavMatch[2].replace(/[.!]$/, '').trim(),
        importance: 6,
      };
    }

    // 8. Name (Personal)
    const nameMatch = text.match(/my name is (.+)/i);
    if (nameMatch) {
      return {
        shouldRemember: true,
        category: 'Personal',
        key: 'Name',
        value: nameMatch[1].replace(/[.!]$/, '').trim(),
        importance: 10,
      };
    }

    // 9. Residence (Location)
    const liveMatch = text.match(/i live in (.+)/i) || text.match(/my home is in (.+)/i);
    if (liveMatch) {
      return {
        shouldRemember: true,
        category: 'Location',
        key: 'Residence',
        value: liveMatch[1].replace(/[.!]$/, '').trim(),
        importance: 9,
      };
    }

    return { shouldRemember: false };
  }
}

export const memoryExtractorService = new MemoryExtractorService();
