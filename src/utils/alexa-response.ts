import { Logger } from './logger';

export interface AlexaResponse {
  version: string;
  sessionAttributes: Record<string, unknown>;
  response: {
    outputSpeech?: {
      type: 'PlainText' | 'SSML';
      text?: string;
      ssml?: string;
    };
    reprompt?: {
      outputSpeech: {
        type: 'PlainText' | 'SSML';
        text?: string;
        ssml?: string;
      };
    };
    shouldEndSession?: boolean;
  };
}

/**
 * Strips Markdown formatting symbols (bold, italics, inline code, headings, links, etc.)
 * from a string to ensure clean plain text for Alexa text-to-speech synthesis.
 *
 * @param text Raw input string containing potential Markdown symbols.
 * @returns Plain text string with Markdown syntax removed.
 */
export function stripMarkdown(text: string): string {
  if (!text) {
    return '';
  }

  return (
    text
      // Remove fenced code blocks
      .replace(/```[\s\S]*?```/g, (match) => match.replace(/```[a-z]*/gi, '').replace(/```/g, ''))
      // Remove inline code ticks: `code` -> code
      .replace(/`([^`]+)`/g, '$1')
      // Remove Markdown links: [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove Markdown images: ![alt](url) -> alt
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Remove headings: # Heading -> Heading
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold and italics: ***text***, **text**, *text*, ___text___, __text__, _text_
      .replace(/(\*\*|__|_|\*)(.*?)\1/g, '$2')
      // Remove strikethrough: ~~text~~ -> text
      .replace(/~~(.*?)~~/g, '$1')
      // Remove blockquotes: > text -> text
      .replace(/^\s*>\s+/gm, '')
      // Remove bullet point symbols at the start of lines: * item, - item, + item
      .replace(/^\s*[*+-]\s+/gm, '')
      // Replace multiple inline whitespace with single spaces
      .replace(/[ \t]+/g, ' ')
      .trim()
  );
}

/**
 * Builds a standard plaintext response for Alexa adhering to the ASK JSON schema specification.
 *
 * Critical invariants enforced here:
 *   1. outputSpeech.text is NEVER empty — falls back to a safe default if stripped text is empty.
 *   2. The complete response JSON is logged before being returned so Render logs always show
 *      the exact payload sent to Alexa.
 *   3. Markdown is stripped so Alexa TTS never speaks raw formatting symbols.
 *
 * @param speechText The text Alexa should speak back.
 * @param shouldEndSession Whether Alexa should close the session.
 * @param repromptText Optional reprompt text when keeping session open. Defaults to speechText.
 * @param sessionAttributes Optional session attributes dictionary. Defaults to {}.
 * @returns A formatted AlexaResponse object with non-empty outputSpeech.text guaranteed.
 */
export function buildAlexaResponse(
  speechText: string,
  shouldEndSession = false,
  repromptText?: string,
  sessionAttributes: Record<string, unknown> = {},
): AlexaResponse {
  // Strip markdown and guard against empty result
  const stripped = stripMarkdown(speechText);
  const cleanSpeechText = stripped.length > 0 ? stripped : 'How can I help you?';

  if (stripped.length === 0) {
    Logger.warn(
      'AlexaResponse',
      `outputSpeech.text was empty after stripMarkdown. Raw input: "${speechText}". Using fallback.`,
    );
  }

  const rawReprompt = repromptText || (shouldEndSession ? undefined : speechText);
  const cleanRepromptText = rawReprompt ? stripMarkdown(rawReprompt) : undefined;
  const safeRepromptText =
    cleanRepromptText && cleanRepromptText.length > 0
      ? cleanRepromptText
      : shouldEndSession
        ? undefined
        : 'How can I help you?';

  const payload: AlexaResponse = {
    version: '1.0',
    sessionAttributes,
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: cleanSpeechText,
      },
      ...(shouldEndSession === false && safeRepromptText
        ? {
            reprompt: {
              outputSpeech: {
                type: 'PlainText',
                text: safeRepromptText,
              },
            },
          }
        : {}),
      shouldEndSession,
    },
  };

  // Log the complete Alexa response JSON so Render logs always show exact payload
  Logger.info('AlexaResponse', `Outbound Alexa JSON:\n${JSON.stringify(payload, null, 2)}`);

  return payload;
}

/**
 * Builds an empty response for SessionEndedRequest adhering to ASK schema specification.
 *
 * @returns A formatted AlexaResponse object for session termination.
 */
export function buildAlexaEmptyResponse(): AlexaResponse {
  const payload: AlexaResponse = {
    version: '1.0',
    sessionAttributes: {},
    response: {
      shouldEndSession: true,
    },
  };

  Logger.info(
    'AlexaResponse',
    `Outbound Alexa JSON (SessionEnded):\n${JSON.stringify(payload, null, 2)}`,
  );

  return payload;
}
