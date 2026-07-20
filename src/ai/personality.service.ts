import { ownerProfileService } from '../profile/owner-profile.service';
import { DEFAULT_PERSONALITY_CONFIG } from './personality.constants';

export interface SystemPromptOptions {
  userId?: string;
  contextSummary?: string;
}

export class PersonalityService {
  /**
   * Generates a consistent, provider-independent system prompt for AI requests.
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

    return prompt.trim();
  }
}

export const personalityService = new PersonalityService();
