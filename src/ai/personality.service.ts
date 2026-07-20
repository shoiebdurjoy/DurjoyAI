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
   * Generates a consistent, provider-independent system prompt for AI requests.
   * Assembles Personality + Brain 0 + Relevant Long-Term Memories + Dialogue History + Live Search Context.
   *
   * @param options System prompt context options
   * @returns Formatted system prompt text string
   */
  public async getSystemPrompt(options?: SystemPromptOptions): Promise<string> {
    const ownerContext = await ownerProfileService.getBrain0Context();

    const rulesBlock = DEFAULT_PERSONALITY_CONFIG.voiceRules
      .map((rule, idx) => `${idx + 1}. ${rule}`)
      .join('\n');

    let prompt =
      `You are ${DEFAULT_PERSONALITY_CONFIG.assistantName}, a personal AI assistant.\n\n` +
      `PERSONALITY & VOICE INSTRUCTIONS:\n${rulesBlock}\n\n` +
      `${ownerContext}`;

    if (options?.contextSummary) {
      prompt += `\n\nRELEVANT MEMORY CONTEXT:\n${options.contextSummary}`;
    }

    if (options?.conversationContext) {
      prompt += `\n\nRECENT CONVERSATION HISTORY:\n${options.conversationContext}`;
    }

    if (options?.webSearchContext) {
      prompt += `\n\n${options.webSearchContext}\nInstructions: Use the live web search information above to answer accurately. Mention sources naturally when helpful without exposing raw implementation details.`;
    }

    return prompt.trim();
  }
}

export const personalityService = new PersonalityService();
