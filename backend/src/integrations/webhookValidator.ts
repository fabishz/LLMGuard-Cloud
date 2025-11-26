import crypto from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * Webhook signature validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate Datadog webhook signature
 * Datadog uses HMAC-SHA256 for webhook signatures
 *
 * The signature is computed as:
 * signature = HMAC-SHA256(webhook_secret, request_body)
 * 
 * @param requestBody - Raw request body as string
 * @param signature - Signature from X-Datadog-Signature header
 * @param secret - Webhook secret from environment
 * @returns Validation result
 */
export function validateDatadogWebhook(
  requestBody: string,
  signature: string | undefined,
  secret: string
): ValidationResult {
  try {
    // Check if signature header is present
    if (!signature) {
      logger.warn('Datadog webhook validation failed: missing signature header');
      return {
        valid: false,
        error: 'Missing X-Datadog-Signature header',
      };
    }

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(requestBody)
      .digest('hex');

    // Compare signatures using constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      logger.warn('Datadog webhook validation failed: signature mismatch');
      return {
        valid: false,
        error: 'Invalid signature',
      };
    }

    logger.debug('Datadog webhook signature validated successfully');
    return { valid: true };
  } catch (error) {
    logger.error({ error }, 'Error validating Datadog webhook signature');
    return {
      valid: false,
      error: 'Signature validation error',
    };
  }
}

/**
 * Validate Stripe webhook signature
 * Stripe uses HMAC-SHA256 with a specific format
 * 
 * The signature is computed as:
 * signature = HMAC-SHA256(webhook_secret, timestamp.payload)
 * 
 * @param requestBody - Raw request body as string
 * @param signature - Signature from Stripe-Signature header
 * @param secret - Webhook secret from environment
 * @param tolerance - Time tolerance in seconds (default: 300)
 * @returns Validation result
 */
export function validateStripeWebhook(
  requestBody: string,
  signature: string | undefined,
  secret: string,
  tolerance: number = 300
): ValidationResult {
  try {
    // Check if signature header is present
    if (!signature) {
      logger.warn('Stripe webhook validation failed: missing signature header');
      return {
        valid: false,
        error: 'Missing Stripe-Signature header',
      };
    }

    // Parse signature header: t=timestamp,v1=signature
    const parts = signature.split(',');
    let timestamp: string | undefined;
    let signedContent: string | undefined;

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key === 'v1') {
        signedContent = value;
      }
    }

    if (!timestamp || !signedContent) {
      logger.warn('Stripe webhook validation failed: invalid signature format');
      return {
        valid: false,
        error: 'Invalid signature format',
      };
    }

    // Check timestamp to prevent replay attacks
    const currentTime = Math.floor(Date.now() / 1000);
    const signedTime = parseInt(timestamp, 10);
    const timeDiff = Math.abs(currentTime - signedTime);

    if (timeDiff > tolerance) {
      logger.warn(
        { timeDiff, tolerance },
        'Stripe webhook validation failed: timestamp outside tolerance'
      );
      return {
        valid: false,
        error: 'Timestamp outside tolerance window',
      };
    }

    // Compute expected signature
    const signedContent_str = `${timestamp}.${requestBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedContent_str)
      .digest('hex');

    // Compare signatures using constant-time comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signedContent),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      logger.warn('Stripe webhook validation failed: signature mismatch');
      return {
        valid: false,
        error: 'Invalid signature',
      };
    }

    logger.debug('Stripe webhook signature validated successfully');
    return { valid: true };
  } catch (error) {
    logger.error({ error }, 'Error validating Stripe webhook signature');
    return {
      valid: false,
      error: 'Signature validation error',
    };
  }
}
