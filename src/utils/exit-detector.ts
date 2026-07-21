/**
 * Detects if a user message indicates explicit intent to leave or end the conversation.
 *
 * @param prompt Input user prompt text
 * @returns True if user requested exit, false otherwise.
 */
export function isExitIntent(prompt: string): boolean {
  if (!prompt || prompt.trim().length === 0) {
    return false;
  }

  const text = prompt.trim().toLowerCase();

  const exitPatterns = [
    /\b(bye|goodbye|see you|talk later|good night|goodnight|exit|quit|stop|nothing else|that's all|thats all|no thanks|thanks bye|thanks goodbye|nothing more)\b/i,
  ];

  return exitPatterns.some((pattern) => pattern.test(text));
}

/**
 * Returns a natural, friendly exit message for session closing.
 *
 * @returns Exit message string
 */
export function getRandomExitMessage(): string {
  const exitMessages = [
    'Alright Durjoy, talk to you later.',
    'See you soon.',
    'Have a great day.',
    'Good luck with everything.',
    "Alright, I'll be here whenever you need me.",
    'Talk to you soon.',
  ];

  const idx = Math.floor(Math.random() * exitMessages.length);
  return exitMessages[idx];
}
