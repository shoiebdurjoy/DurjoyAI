const REPROMPT_OPTIONS = [
  'Anything else?',
  "I'm listening.",
  'What are you thinking?',
  'Go ahead.',
  'Tell me.',
  "What's next?",
  'Need anything else?',
  'How can I help?',
  'Anything on your mind?',
];

let lastRepromptIndex = -1;

/**
 * Returns a randomly rotated natural follow-up reprompt string.
 * Prevents consecutive duplicates for a dynamic, natural conversational feel.
 *
 * @returns Rotated natural reprompt phrase string
 */
export function getRandomReprompt(): string {
  let idx = Math.floor(Math.random() * REPROMPT_OPTIONS.length);
  if (idx === lastRepromptIndex) {
    idx = (idx + 1) % REPROMPT_OPTIONS.length;
  }
  lastRepromptIndex = idx;
  return REPROMPT_OPTIONS[idx];
}
