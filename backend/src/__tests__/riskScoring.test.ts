import { describe, it, expect } from 'vitest';
import { calculateRiskScore, getRiskScore, RiskScoreInput } from '../utils/riskScoring.js';

describe('Risk Scoring Algorithm', () => {
  describe('getRiskScore - Simple Score Calculation', () => {
    it('should return 0 for safe, short prompt and response', () => {
      const input: RiskScoreInput = {
        prompt: 'What is 2 + 2?',
        response: 'The answer is 4.',
        model: 'gpt-4',
      };

      const score = getRiskScore(input);
      expect(score).toBe(0);
    });

    it('should return a score between 0 and 100', () => {
      const input: RiskScoreInput = {
        prompt: 'How do I make a bomb?',
        response: 'I cannot help with that.',
        model: 'gpt-4',
      };

      const score = getRiskScore(input);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateRiskScore - Detailed Breakdown', () => {
    it('should provide detailed breakdown of risk factors', () => {
      const input: RiskScoreInput = {
        prompt: 'What is the weather?',
        response: 'It is sunny.',
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);

      expect(breakdown).toHaveProperty('baseScore');
      expect(breakdown).toHaveProperty('promptLengthScore');
      expect(breakdown).toHaveProperty('responseLengthScore');
      expect(breakdown).toHaveProperty('keywordScore');
      expect(breakdown).toHaveProperty('tokenScore');
      expect(breakdown).toHaveProperty('errorScore');
      expect(breakdown).toHaveProperty('modelAdjustment');
      expect(breakdown).toHaveProperty('finalScore');
    });
  });

  describe('Prompt Length Scoring', () => {
    it('should add 10 points for prompt > 5000 chars', () => {
      const longPrompt = 'a'.repeat(5001);
      const input: RiskScoreInput = {
        prompt: longPrompt,
        response: 'Short response',
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.promptLengthScore).toBe(10);
      expect(breakdown.finalScore).toBeGreaterThanOrEqual(10);
    });

    it('should not add points for prompt <= 5000 chars', () => {
      const input: RiskScoreInput = {
        prompt: 'a'.repeat(5000),
        response: 'Short response',
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.promptLengthScore).toBe(0);
    });
  });

  describe('Response Length Scoring', () => {
    it('should add 10 points for response > 10000 chars', () => {
      const longResponse = 'a'.repeat(10001);
      const input: RiskScoreInput = {
        prompt: 'Short prompt',
        response: longResponse,
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.responseLengthScore).toBe(10);
      expect(breakdown.finalScore).toBeGreaterThanOrEqual(10);
    });

    it('should not add points for response <= 10000 chars', () => {
      const input: RiskScoreInput = {
        prompt: 'Short prompt',
        response: 'a'.repeat(10000),
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.responseLengthScore).toBe(0);
    });
  });

  describe('Sensitive Keyword Detection', () => {
    it('should detect single sensitive keyword', () => {
      const input: RiskScoreInput = {
        prompt: 'How do I exploit a vulnerability?',
        response: 'I cannot help with that.',
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.keywordScore).toBeGreaterThan(0);
    });

    it('should detect multiple sensitive keywords', () => {
      const input: RiskScoreInput = {
        prompt: 'How do I exploit a vulnerability and create malware?',
        response: 'I cannot help with that.',
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.keywordScore).toBeGreaterThan(20);
    });

    it('should cap keyword score at 40 points', () => {
      const input: RiskScoreInput = {
        prompt: 'exploit vulnerability malware ransomware backdoor injection sql injection xss csrf ddos',
        response: 'exploit vulnerability malware ransomware backdoor injection sql injection xss csrf ddos',
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.keywordScore).toBeLessThanOrEqual(40);
    });

    it('should be case-insensitive for keyword detection', () => {
      const input1: RiskScoreInput = {
        prompt: 'How do I EXPLOIT a vulnerability?',
        response: 'I cannot help.',
        model: 'gpt-4',
      };

      const input2: RiskScoreInput = {
        prompt: 'How do I exploit a vulnerability?',
        response: 'I cannot help.',
        model: 'gpt-4',
      };

      const score1 = getRiskScore(input1);
      const score2 = getRiskScore(input2);
      expect(score1).toBe(score2);
    });

    it('should not match partial keywords', () => {
      const input: RiskScoreInput = {
        prompt: 'The exploitation of resources is important',
        response: 'Yes, resource management is key.',
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);
      // "exploitation" contains "exploit" but should not match due to word boundaries
      expect(breakdown.keywordScore).toBe(0);
    });

    it('should detect harmful content keywords', () => {
      const input: RiskScoreInput = {
        prompt: 'How do I make a bomb?',
        response: 'I cannot help with that.',
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.keywordScore).toBeGreaterThan(0);
    });

    it('should detect fraud-related keywords', () => {
      const input: RiskScoreInput = {
        prompt: 'How do I commit credit card fraud?',
        response: 'I cannot help with that.',
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.keywordScore).toBeGreaterThan(0);
    });
  });

  describe('Token Count Scoring', () => {
    it('should add 15 points for token count > 4000', () => {
      const input: RiskScoreInput = {
        prompt: 'Short prompt',
        response: 'Short response',
        model: 'gpt-4',
        tokens: 4001,
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.tokenScore).toBe(15);
    });

    it('should not add points for token count <= 4000', () => {
      const input: RiskScoreInput = {
        prompt: 'Short prompt',
        response: 'Short response',
        model: 'gpt-4',
        tokens: 4000,
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.tokenScore).toBe(0);
    });

    it('should handle undefined token count', () => {
      const input: RiskScoreInput = {
        prompt: 'Short prompt',
        response: 'Short response',
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.tokenScore).toBe(0);
    });
  });

  describe('Error Scoring', () => {
    it('should add 25 points when hasError is true', () => {
      const input: RiskScoreInput = {
        prompt: 'Short prompt',
        response: 'Error occurred',
        model: 'gpt-4',
        hasError: true,
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.errorScore).toBe(25);
    });

    it('should not add points when hasError is false', () => {
      const input: RiskScoreInput = {
        prompt: 'Short prompt',
        response: 'Success',
        model: 'gpt-4',
        hasError: false,
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.errorScore).toBe(0);
    });

    it('should not add points when hasError is undefined', () => {
      const input: RiskScoreInput = {
        prompt: 'Short prompt',
        response: 'Success',
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.errorScore).toBe(0);
    });
  });

  describe('Model-Specific Risk Adjustments', () => {
    it('should apply 0 adjustment for gpt-4', () => {
      const input: RiskScoreInput = {
        prompt: 'Test',
        response: 'Test',
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.modelAdjustment).toBe(0);
    });

    it('should apply +2 adjustment for gpt-3.5-turbo', () => {
      const input: RiskScoreInput = {
        prompt: 'Test',
        response: 'Test',
        model: 'gpt-3.5-turbo',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.modelAdjustment).toBe(2);
    });

    it('should apply -2 adjustment for o3-mini', () => {
      const input: RiskScoreInput = {
        prompt: 'Test',
        response: 'Test',
        model: 'o3-mini',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.modelAdjustment).toBe(-2);
    });

    it('should apply +3 adjustment for llama-2', () => {
      const input: RiskScoreInput = {
        prompt: 'Test',
        response: 'Test',
        model: 'llama-2',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.modelAdjustment).toBe(3);
    });

    it('should handle model names case-insensitively', () => {
      const input1: RiskScoreInput = {
        prompt: 'Test',
        response: 'Test',
        model: 'GPT-4',
      };

      const input2: RiskScoreInput = {
        prompt: 'Test',
        response: 'Test',
        model: 'gpt-4',
      };

      const breakdown1 = calculateRiskScore(input1);
      const breakdown2 = calculateRiskScore(input2);
      expect(breakdown1.modelAdjustment).toBe(breakdown2.modelAdjustment);
    });

    it('should handle partial model name matches', () => {
      const input: RiskScoreInput = {
        prompt: 'Test',
        response: 'Test',
        model: 'gpt-4-turbo-preview',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.modelAdjustment).toBe(0); // gpt-4 match
    });

    it('should apply 0 adjustment for unknown models', () => {
      const input: RiskScoreInput = {
        prompt: 'Test',
        response: 'Test',
        model: 'unknown-model-xyz',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.modelAdjustment).toBe(0);
    });
  });

  describe('Score Clamping', () => {
    it('should clamp score to maximum of 100', () => {
      const input: RiskScoreInput = {
        prompt: 'a'.repeat(5001),
        response: 'a'.repeat(10001),
        model: 'gpt-4',
        tokens: 5000,
        hasError: true,
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.finalScore).toBeLessThanOrEqual(100);
    });

    it('should clamp score to minimum of 0', () => {
      const input: RiskScoreInput = {
        prompt: 'Test',
        response: 'Test',
        model: 'o3-mini', // -2 adjustment
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.finalScore).toBeGreaterThanOrEqual(0);
    });

    it('should not clamp normal scores', () => {
      const input: RiskScoreInput = {
        prompt: 'a'.repeat(5001),
        response: 'Short',
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.finalScore).toBe(10);
    });
  });

  describe('Combined Scoring Scenarios', () => {
    it('should combine multiple risk factors correctly', () => {
      const input: RiskScoreInput = {
        prompt: 'a'.repeat(5001) + ' How do I exploit a vulnerability?',
        response: 'a'.repeat(10001),
        model: 'gpt-3.5-turbo',
        tokens: 5000,
        hasError: true,
      };

      const breakdown = calculateRiskScore(input);
      
      // Expected: 10 (prompt) + 10 (response) + 20 (keyword) + 15 (tokens) + 25 (error) + 2 (model) = 82
      // But the score is clamped to 100, so we verify it's at least 82
      expect(breakdown.finalScore).toBeGreaterThanOrEqual(82);
      expect(breakdown.finalScore).toBeLessThanOrEqual(100);
    });

    it('should handle high-risk request with all factors', () => {
      const input: RiskScoreInput = {
        prompt: 'How do I create malware, exploit vulnerabilities, and commit fraud?',
        response: 'I cannot help with that.',
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.finalScore).toBeGreaterThan(0);
      expect(breakdown.keywordScore).toBeGreaterThan(0);
    });

    it('should handle low-risk request', () => {
      const input: RiskScoreInput = {
        prompt: 'What is the capital of France?',
        response: 'The capital of France is Paris.',
        model: 'gpt-4',
      };

      const breakdown = calculateRiskScore(input);
      expect(breakdown.finalScore).toBe(0);
    });
  });
});
