import { ownerProfileService } from '../profile/owner-profile.service';
import { DEFAULT_PERSONALITY_CONFIG } from './personality.constants';

export interface SystemPromptOptions {
  userId?: string;
  contextSummary?: string;
  conversationContext?: string;
  webSearchContext?: string;
}

export class PersonalityService {
  /**
   * Generates an optimized, provider-independent system prompt for AI completions.
   * Assembles Voice Rules + Owner Profile + Memory Context + Session Dialogue + Live Web Search.
   *
   * @param options System prompt context options
   * @returns Formatted system prompt text string
   */
  public async getSystemPrompt(options?: SystemPromptOptions): Promise<string> {
    const ownerContext = await ownerProfileService.getBrain0Context();

    const rulesBlock = DEFAULT_PERSONALITY_CONFIG.voiceRules
      .map((rule, idx) => `${idx + 1}. ${rule}`)
      .join('\n');

    const sections: string[] = [
      `You are ${DEFAULT_PERSONALITY_CONFIG.assistantName}, a personal AI assistant.`,
      `VOICE RULES:\n${rulesBlock}`,
      ownerContext,
    ];

    if (options?.contextSummary) {
      sections.push(`RELEVANT MEMORY CONTEXT:\n${options.contextSummary}`);
    }

    if (options?.conversationContext) {
      sections.push(`RECENT DIALOGUE:\n${options.conversationContext}`);
    }

    if (options?.webSearchContext) {
      sections.push(
        `${options.webSearchContext}\nInstructions: Use the search data above accurately. Attribute sources naturally when helpful.`,
      );
    }

    return sections.join('\n\n').trim();
  }
}

export const personalityService = new PersonalityService();
