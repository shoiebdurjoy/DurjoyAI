import { Request, Response, NextFunction } from 'express';
import { verifyAlexaRequest } from '../alexa/verifier';

/**
 * Express middleware that cryptographically validates that requests targeting
 * the webhook actually originate from Amazon's Alexa Skills Kit.
 */
export async function alexaVerificationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const skipVerification = process.env.SKIP_ALEXA_VERIFICATION === 'true';
  if (skipVerification) {
    // eslint-disable-next-line no-console
    console.log('[Alexa Middleware] Request verification skipped (configured in environment).');
    return next();
  }

  const signatureCertChainUrl = req.headers['signaturecertchainurl'] as string;
  const signature = req.headers['signature'] as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawBody = (req as any).rawBody;

  if (!signatureCertChainUrl || !signature || !rawBody) {
    res.status(400).json({
      status: 'error',
      message: 'Missing required Alexa signature headers or raw request body.',
    });
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
      res.status(400).json({
        status: 'error',
        message: 'Alexa request verification failed.',
      });
      return;
    }

    next();
  } catch (error: unknown) {
    const err = error as Error;
    // eslint-disable-next-line no-console
    console.error('[Alexa Middleware] Verification internal error:', err.message);
    res.status(400).json({
      status: 'error',
      message: 'Internal error processing request signature verification.',
    });
  }
}
