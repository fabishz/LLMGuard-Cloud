/**
 * Risk Scoring Algorithm for LLM Requests
 * Analyzes prompts and responses to compute a security/safety risk score (0-100)
 */

/**
 * Sensitive keywords that indicate potentially risky content
 */
const SENSITIVE_KEYWORDS = [
  // Security/hacking related
  'exploit', 'vulnerability', 'malware', 'ransomware', 'backdoor', 'injection',
  'sql injection', 'xss', 'csrf', 'ddos', 'brute force', 'password crack',
  'hack', 'breach', 'unauthorized access', 'privilege escalation',
  
  // Harmful content
  'bomb', 'weapon', 'kill', 'murder', 'suicide', 'self-harm', 'abuse',
  'violence', 'illegal', 'drug', 'cocaine', 'heroin', 'methamphetamine',
  
  // Fraud/scam
  'phishing', 'scam', 'fraud', 'money laundering', 'counterfeit',
  'credit card fraud', 'identity theft', 'ponzi', 'pyramid scheme',
  
  // Privacy violations
  'doxxing', 'stalking', 'harassment', 'blackmail', 'extortion',
  'private information', 'personal data', 'ssn', 'social security',
  
  // Discriminatory content
  'racist', 'sexist', 'hate speech', 'discrimination', 'bigotry',
];

/**
 * Model-specific risk adjustments
 * Some models may have different risk profiles
 */
const MODEL_RISK_ADJUSTMENTS: Record<string, number> = {
  'gpt-4': 0,
  'gpt-4-turbo': 0,
  'gpt-3.5-turbo': 2,
  'o3-mini': -2,
  'claude-3': -1,
  'llama-2': 3,
};

/**
 * Input for risk score calculation
 */
export interface RiskScoreInput {
  prompt: string;
  response: string;
  model: string;
  tokens?: number;
  hasError?: boolean;
}

/**
 * Detailed risk score breakdown
 */
export interface RiskScoreBreakdown {
  baseScore: number;
  promptLengthScore: number;
  responseLengthScore: number;
  keywordScore: number;
  tokenScore: number;
  errorScore: number;
  modelAdjustment: number;
  finalScore: number;
}

/**
 * Detects sensitive keywords in text
 * @param text - Text to analyze
 * @returns Number of sensitive keywords found
 */
function detectSensitiveKeywords(text: string): number {
  const lowerText = text.toLowerCase();
  let count = 0;

  for (const keyword of SENSITIVE_KEYWORDS) {
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      count += matches.length;
    }
  }

  return count;
}

/**
 * Gets model-specific risk adjustment
 * @param model - Model name
 * @returns Risk adjustment value
 */
function getModelAdjustment(model: string): number {
  const normalizedModel = model.toLowerCase();
  
  // Check for exact match
  if (normalizedModel in MODEL_RISK_ADJUSTMENTS) {
    return MODEL_RISK_ADJUSTMENTS[normalizedModel];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(MODEL_RISK_ADJUSTMENTS)) {
    if (normalizedModel.includes(key)) {
      return value;
    }
  }

  // Default adjustment for unknown models
  return 0;
}

/**
 * Calculates risk score for an LLM request
 * 
 * Scoring breakdown:
 * - Base score: 0
 * - Prompt length > 5000 chars: +10
 * - Response length > 10000 chars: +10
 * - Sensitive keywords detected: +20 per keyword (capped at +40)
 * - High token count (>4000): +15
 * - Error in response: +25
 * - Model-specific adjustment: ±5
 * - Final score: clamped to 0-100
 * 
 * @param input - Risk score input containing prompt, response, and model
 * @returns Risk score breakdown with final score
 */
export function calculateRiskScore(input: RiskScoreInput): RiskScoreBreakdown {
  let score = 0;
  const breakdown: RiskScoreBreakdown = {
    baseScore: 0,
    promptLengthScore: 0,
    responseLengthScore: 0,
    keywordScore: 0,
    tokenScore: 0,
    errorScore: 0,
    modelAdjustment: 0,
    finalScore: 0,
  };

  // Prompt length check (> 5000 chars)
  if (input.prompt.length > 5000) {
    breakdown.promptLengthScore = 10;
    score += 10;
  }

  // Response length check (> 10000 chars)
  if (input.response.length > 10000) {
    breakdown.responseLengthScore = 10;
    score += 10;
  }

  // Sensitive keyword detection
  const promptKeywords = detectSensitiveKeywords(input.prompt);
  const responseKeywords = detectSensitiveKeywords(input.response);
  const totalKeywords = promptKeywords + responseKeywords;
  
  // +20 per keyword, capped at +40
  breakdown.keywordScore = Math.min(totalKeywords * 20, 40);
  score += breakdown.keywordScore;

  // High token count check (> 4000 tokens)
  if (input.tokens && input.tokens > 4000) {
    breakdown.tokenScore = 15;
    score += 15;
  }

  // Error in response
  if (input.hasError) {
    breakdown.errorScore = 25;
    score += 25;
  }

  // Model-specific adjustment
  breakdown.modelAdjustment = getModelAdjustment(input.model);
  score += breakdown.modelAdjustment;

  // Clamp score to 0-100 range
  breakdown.finalScore = Math.max(0, Math.min(100, score));

  return breakdown;
}

/**
 * Simplified version that returns just the final score
 * @param input - Risk score input
 * @returns Final risk score (0-100)
 */
export function getRiskScore(input: RiskScoreInput): number {
  return calculateRiskScore(input).finalScore;
}
