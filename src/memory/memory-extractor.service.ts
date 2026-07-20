import { persistentMemoryService, PersistentMemoryService } from './persistent-memory.service';
import { MemoryRecord } from './memory.interface';

export interface ExtractedFact {
  shouldRemember: boolean;
  category?: string;
  key?: string;
  value?: string;
  importance?: number;
}

export class MemoryExtractorService {
  constructor(private readonly memoryService: PersistentMemoryService = persistentMemoryService) {}

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

    return this.memoryService.saveMemory(
      extracted.category,
      extracted.key,
      extracted.value,
      extracted.importance ?? 3,
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
      return null;
    }

    // Ignore greetings, weather, small talk, jokes, lunch
    if (!this.memoryService.shouldRemember(prompt)) {
      return { shouldRemember: false };
    }

    const text = prompt.trim();

    // 1. Favorite Club / Sport Team
    const favClubMatch =
      text.match(/my favorite (football |soccer |sports )?club is (.+)/i) ||
      text.match(/my favorite team is (.+)/i);
    if (favClubMatch) {
      return {
        shouldRemember: true,
        category: 'Preference',
        key: 'Favorite Football Club',
        value: favClubMatch[2].replace(/[.!]$/, '').trim(),
        importance: 4,
      };
    }

    // 2. Education & Major
    const eduMatch = text.match(/i study (.+?) at (.+)/i) || text.match(/i am a student at (.+)/i);
    if (eduMatch) {
      return {
        shouldRemember: true,
        category: 'Education',
        key: 'University',
        value: eduMatch[2].replace(/[.!]$/, '').trim(),
        importance: 5,
      };
    }

    // 3. Hardware / Device / GPU
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
        importance: 4,
      };
    }

    // 4. Laptop
    const laptopMatch =
      text.match(/i (bought|have|use) a new laptop:? (.+)/i) ||
      text.match(/my laptop is (an? )?(.+)/i);
    if (laptopMatch) {
      return {
        shouldRemember: true,
        category: 'Device',
        key: 'Laptop',
        value: laptopMatch[2].replace(/[.!]$/, '').trim(),
        importance: 4,
      };
    }

    // 5. Work / Career
    const workMatch = text.match(/i work as (an? )?(.+)/i) || text.match(/my job is (an? )?(.+)/i);
    if (workMatch) {
      return {
        shouldRemember: true,
        category: 'Career',
        key: 'Occupation',
        value: workMatch[2].replace(/[.!]$/, '').trim(),
        importance: 4,
      };
    }

    // 6. Generic Favorite
    const genFavMatch = text.match(/my favorite ([a-z\s]+) is (.+)/i);
    if (genFavMatch) {
      const key = genFavMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        shouldRemember: true,
        category: 'Preference',
        key: `Favorite ${key}`,
        value: genFavMatch[2].replace(/[.!]$/, '').trim(),
        importance: 3,
      };
    }

    // 7. Name
    const nameMatch = text.match(/my name is (.+)/i);
    if (nameMatch) {
      return {
        shouldRemember: true,
        category: 'Personal',
        key: 'Name',
        value: nameMatch[1].replace(/[.!]$/, '').trim(),
        importance: 5,
      };
    }

    return { shouldRemember: false };
  }
}

export const memoryExtractorService = new MemoryExtractorService();
