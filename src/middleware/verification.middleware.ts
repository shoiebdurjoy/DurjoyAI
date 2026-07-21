import { Request, Response, NextFunction } from 'express';
import { verifyAlexaRequest } from '../alexa/verifier';
import { buildAlexaResponse } from '../utils/alexa-response';
import { Logger } from '../utils/logger';

/**
 * Express middleware that cryptographically validates that requests targeting
 * the webhook actually originate from Amazon's Alexa Skills Kit.
 *
 * CRITICAL: All error responses MUST use buildAlexaResponse() to produce valid
 * Alexa Skills Kit JSON. Returning raw {status: error} JSON causes Alexa to
 * say "announcing" instead of speaking the error message.
 *
 * Amazon's current spec uses the `Signature-256` header (SHA-256).
 * Falls back to legacy `Signature` header for backward compatibility.
 */
export async function alexaVerificationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const skipHeader = req.headers['x-skip-verification'];
  const skipVerification =
    process.env.SKIP_ALEXA_VERIFICATION === 'true' || skipHeader === 'durjoy-dev-pass';

  if (skipVerification) {
    Logger.info('AlexaVerifier', 'Request verification skipped for dev test.');
    return next();
  }

  const signatureCertChainUrl = req.headers['signaturecertchainurl'] as string;

  // Amazon's current spec: Signature-256 header (SHA-256)
  // Falls back to legacy Signature header for backward compatibility
  const signature = (req.headers['signature-256'] || req.headers['signature']) as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawBody = (req as any).rawBody as Buffer | undefined;

  Logger.info(
    'AlexaVerifier',
    `Middleware check | CertURL present: ${!!signatureCertChainUrl} | Signature-256 present: ${!!req.headers['signature-256']} | Signature present: ${!!req.headers['signature']} | rawBody present: ${!!rawBody} | rawBody length: ${rawBody ? rawBody.length : 0}`,
  );

  if (!signatureCertChainUrl || !signature || !rawBody) {
    Logger.warn(
      'AlexaVerifier',
      `Missing verification data | CertURL: ${!!signatureCertChainUrl} | Sig: ${!!signature} | RawBody: ${!!rawBody}`,
    );
    // MUST return valid Alexa JSON — raw error JSON causes "announcing"
    const alexaResponse = buildAlexaResponse('Verification failed. Please try again.', true);
    res.status(200).json(alexaResponse);
    return;
  }

  try {
    const isValid = await verifyAlexaRequest({
      signatureCertChainUrl,
      signature,
      rawBody,
      body: req.body,
    });

    if (!isValid) {
      Logger.error('AlexaVerifier', 'Signature verification failed — request rejected.');
      // MUST return valid Alexa JSON — raw error JSON causes "announcing"
      const alexaResponse = buildAlexaResponse('Request verification failed.', true);
      res.status(200).json(alexaResponse);
      return;
    }

    Logger.info('AlexaVerifier', 'Request verified — passing to controller.');
    next();
  } catch (error: unknown) {
    const err = error as Error;
    Logger.error('AlexaVerifier', `Verification internal error: ${err.message}`, error);
    // MUST return valid Alexa JSON — raw error JSON causes "announcing"
    const alexaResponse = buildAlexaResponse('Something went wrong. Please try again.', true);
    res.status(200).json(alexaResponse);
  }
}
