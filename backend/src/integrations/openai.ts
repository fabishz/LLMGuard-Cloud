import OpenAI from 'openai';
import env from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Root Cause Analysis result from OpenAI
 */
export interface RCAResult {
  severity: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  recommendedFix: string;
}

/**
 * LLM Request data for RCA analysis
 */
export interface LLMRequestForAnalysis {
  id: string;
  prompt: string;
  response: string;
  model: string;
  latency: number;
  tokens: number;
  riskScore: number;
  error?: string;
  createdAt: Date;
}

/**
 * Initialize OpenAI client
 */
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Generate a structured prompt for RCA analysis
 * 
 * @param requests - Array of related LLM requests
 * @param incidentMetadata - Incident metadata (trigger type, severity, etc.)
 * @returns Formatted prompt for OpenAI
 */
function generateRCAPrompt(
  requests: LLMRequestForAnalysis[],
  incidentMetadata: Record<string, any>
): string {
  const requestsSummary = requests
    .map((req, idx) => {
      return `Request ${idx + 1}:
- Model: ${req.model}
- Latency: ${req.latency}ms
- Tokens: ${req.tokens}
- Risk Score: ${req.riskScore}
- Error: ${req.error || 'None'}
- Prompt: ${req.prompt.substring(0, 200)}${req.prompt.length > 200 ? '...' : ''}
- Response: ${req.response.substring(0, 200)}${req.response.length > 200 ? '...' : ''}`;
    })
    .join('\n\n');

  const prompt = `You are an expert in analyzing LLM (Large Language Model) request patterns and incidents. 
Analyze the following LLM requests and incident metadata to provide a root cause analysis.

Incident Information:
- Trigger Type: ${incidentMetadata.triggerType || 'Unknown'}
- Severity: ${incidentMetadata.severity || 'Unknown'}
- Metadata: ${JSON.stringify(incidentMetadata, null, 2)}

Related LLM Requests:
${requestsSummary}

Based on this data, provide a JSON response with the following structure (and ONLY this structure, no additional text):
{
  "severity": "low|medium|high|critical",
  "rootCause": "A concise explanation of the root cause (1-2 sentences)",
  "recommendedFix": "A specific, actionable recommendation to fix the issue (1-2 sentences)"
}

Ensure the severity matches the incident severity or is more specific based on the request patterns.
Focus on technical root causes related to model behavior, latency, error patterns, or risk indicators.`;

  return prompt;
}

/**
 * Parse OpenAI response to extract RCA data
 * 
 * @param content - Raw response content from OpenAI
 * @returns Parsed RCA result
 */
function parseRCAResponse(content: string): RCAResult {
  try {
    // Extract JSON from the response (handle cases where there's extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.severity || !parsed.rootCause || !parsed.recommendedFix) {
      throw new Error('Missing required fields in RCA response');
    }

    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(parsed.severity)) {
      throw new Error(`Invalid severity: ${parsed.severity}`);
    }

    return {
      severity: parsed.severity,
      rootCause: parsed.rootCause.trim(),
      recommendedFix: parsed.recommendedFix.trim(),
    };
  } catch (error) {
    logger.error({ error, content }, 'Failed to parse RCA response');
    throw new Error('Failed to parse RCA response from OpenAI');
  }
}

/**
 * Generate Root Cause Analysis for an incident using OpenAI
 * 
 * @param requests - Array of related LLM requests (typically last 20)
 * @param incidentMetadata - Incident metadata for context
 * @returns RCA result with severity, root cause, and recommended fix
 */
export async function generateRCA(
  requests: LLMRequestForAnalysis[],
  incidentMetadata: Record<string, any>
): Promise<RCAResult> {
  try {
    if (requests.length === 0) {
      logger.warn('No requests provided for RCA generation');
      return getFallbackRCA(incidentMetadata);
    }

    const prompt = generateRCAPrompt(requests, incidentMetadata);

    logger.debug(
      { requestCount: requests.length, triggerType: incidentMetadata.triggerType },
      'Generating RCA with OpenAI'
    );

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent, factual responses
      max_tokens: 500,
    });

    if (!response.choices[0]?.message?.content) {
      throw new Error('Empty response from OpenAI');
    }

    const rca = parseRCAResponse(response.choices[0].message.content);

    logger.info(
      { severity: rca.severity, triggerType: incidentMetadata.triggerType },
      'RCA generated successfully'
    );

    return rca;
  } catch (error) {
    logger.error(
      { error, triggerType: incidentMetadata.triggerType },
      'Error generating RCA with OpenAI'
    );

    // Return fallback RCA on error
    return getFallbackRCA(incidentMetadata);
  }
}

/**
 * Get fallback RCA when OpenAI API fails or is unavailable
 * Provides a generic but reasonable RCA based on incident metadata
 * 
 * @param incidentMetadata - Incident metadata
 * @returns Fallback RCA result
 */
export function getFallbackRCA(incidentMetadata: Record<string, any>): RCAResult {
  const triggerType = incidentMetadata.triggerType || 'unknown';
  const severity = incidentMetadata.severity || 'medium';

  const fallbackResponses: Record<string, RCAResult> = {
    latency_threshold: {
      severity: 'high',
      rootCause: 'LLM requests are experiencing elevated latency, potentially due to model overload or network delays.',
      recommendedFix: 'Consider implementing request queuing, increasing timeout thresholds, or switching to a faster model variant.',
    },
    error_rate: {
      severity: 'high',
      rootCause: 'A high error rate has been detected in LLM requests, indicating potential API issues or invalid request parameters.',
      recommendedFix: 'Review error logs for specific error messages, validate request parameters, and check API service status.',
    },
    risk_score_anomaly: {
      severity: 'high',
      rootCause: 'Multiple consecutive requests have been flagged with high risk scores, suggesting potentially unsafe or anomalous content.',
      recommendedFix: 'Review the flagged requests for content patterns, consider increasing safety thresholds, or implementing content filtering.',
    },
    cost_spike: {
      severity: 'medium',
      rootCause: 'Daily costs have increased significantly above the historical average, likely due to increased token usage or model changes.',
      recommendedFix: 'Analyze token usage patterns, consider optimizing prompts for brevity, or review model selection for cost efficiency.',
    },
    webhook: {
      severity: 'medium',
      rootCause: 'An external monitoring system has detected an anomaly and triggered an incident alert.',
      recommendedFix: 'Review the external monitoring system alert details and investigate the underlying cause.',
    },
    manual: {
      severity: 'medium',
      rootCause: 'An incident was manually created by a user or administrator.',
      recommendedFix: 'Review the incident details and take appropriate action based on the specific issue.',
    },
  };

  return (
    fallbackResponses[triggerType] || {
      severity: severity as 'low' | 'medium' | 'high' | 'critical',
      rootCause: 'An incident has been detected in your LLM request patterns.',
      recommendedFix: 'Review the incident details and related requests to determine the appropriate action.',
    }
  );
}
