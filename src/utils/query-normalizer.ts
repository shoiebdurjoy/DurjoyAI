/**
 * Normalizes speech input to handle common speech recognition mistakes,
 * typos, missing words, and phonetic variations.
 */
export function normalizeQuery(prompt: string): string {
  if (!prompt || prompt.trim().length === 0) {
    return '';
  }

  let text = prompt.trim().toLowerCase();

  // Replacements dictionary for common speech/typo misrecognitions
  const replacements: Array<[RegExp, string]> = [
    // Typo & phonetic score/fifa replacements
    [/\blatest fifa scare\b/g, 'latest fifa score'],
    [/\blatest fipa score\b/g, 'latest fifa score'],
    [/\bfifa tweny six\b/g, 'fifa 2026'],
    [/\bfifa twenty six\b/g, 'fifa 2026'],
    [/\bfipa\b/g, 'fifa'],
    [/\bscare\b/g, 'score'],

    // Typo & missing word age replacements
    [/\bwhat my age\b/g, 'how old am i'],
    [/\bwhats my ag\b/g, 'how old am i'],
    [/\bwhat is my ag\b/g, 'how old am i'],
    [/\bmy ag\b/g, 'my age'],

    // Preference/Color typos
    [/\bmy fav color\b/g, 'my favorite color'],
    [/\bfavrite colour\b/g, 'favorite color'],
    [/\bfavrite\b/g, 'favorite'],
    [/\bcolour\b/g, 'color'],

    // Memory typos
    [/\bremeber this\b/g, 'remember this'],
    [/\brember this\b/g, 'remember this'],
    [/\bremeber\b/g, 'remember'],
    [/\brember\b/g, 'remember'],

    // News/Weather/Time typos
    [/\btodys news\b/g, "today's news"],
    [/\blates news\b/g, 'latest news'],
    [/\blates\b/g, 'latest'],
    [/\bweathr\b/g, 'weather'],
    [/\bcalender\b/g, 'calendar'],
    [/\bremind me tmrw\b/g, 'remind me tomorrow'],
    [/\btmrw\b/g, 'tomorrow'],
    [/\bwhts\b/g, 'what is'],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  return text;
}
