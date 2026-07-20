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
      .replace(/(\*\*|__|\*|_)(.*?)\1/g, '$2')
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
 * Automatically strips Markdown formatting from speech and reprompt text.
 *
 * @param speechText The text Alexa should speak back.
 * @param shouldEndSession Whether Alexa should close the session.
 * @param repromptText Optional reprompt text when keeping session open. Defaults to speechText.
 * @param sessionAttributes Optional session attributes dictionary. Defaults to {}.
 * @returns A formatted AlexaResponse object.
 */
export function buildAlexaResponse(
  speechText: string,
  shouldEndSession = false,
  repromptText?: string,
  sessionAttributes: Record<string, unknown> = {},
): AlexaResponse {
  const cleanSpeechText = stripMarkdown(speechText);
  const rawReprompt = repromptText || (shouldEndSession ? undefined : speechText);
  const cleanRepromptText = rawReprompt ? stripMarkdown(rawReprompt) : undefined;

  return {
    version: '1.0',
    sessionAttributes,
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: cleanSpeechText,
      },
      ...(shouldEndSession === false && cleanRepromptText
        ? {
            reprompt: {
              outputSpeech: {
                type: 'PlainText',
                text: cleanRepromptText,
              },
            },
          }
        : {}),
      shouldEndSession,
    },
  };
}

/**
 * Builds an empty response for SessionEndedRequest adhering to ASK schema specification.
 *
 * @returns A formatted AlexaResponse object for session termination.
 */
export function buildAlexaEmptyResponse(): AlexaResponse {
  return {
    version: '1.0',
    sessionAttributes: {},
    response: {
      shouldEndSession: true,
    },
  };
}
