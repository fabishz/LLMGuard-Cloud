import prisma from '../src/config/database.js';
import { hashPassword, hashApiKey, generateApiKey } from '../src/utils/crypto.js';
import { logger } from '../src/utils/logger.js';

/**
 * Seed script for development database
 * Creates sample users, projects, LLM requests, and incidents
 */

async function main() {
  try {
    logger.info('Starting database seed...');

    // Clear existing data (in reverse order of dependencies)
    await prisma.remediationAction.deleteMany({});
    await prisma.incident.deleteMany({});
    await prisma.metricsCache.deleteMany({});
    await prisma.lLMRequest.deleteMany({});
    await prisma.apiKey.deleteMany({});
    await prisma.projectSettings.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.userSettings.deleteMany({});
    await prisma.billing.deleteMany({});
    await prisma.user.deleteMany({});

    logger.info('Cleared existing data');

    // Create sample users
    const hashedPassword = await hashPassword('SecurePass123!');

    const user1 = await prisma.user.create({
      data: {
        email: 'alice@example.com',
        password: hashedPassword,
        name: 'Alice Johnson',
        role: 'user',
      },
    });

    const user2 = await prisma.user.create({
      data: {
        email: 'bob@example.com',
        password: hashedPassword,
        name: 'Bob Smith',
        role: 'user',
      },
    });

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
      },
    });

    logger.info('Created 3 sample users');

    // Create user settings
    await prisma.userSettings.create({
      data: {
        userId: user1.id,
        name: 'Alice Johnson',
        email: 'alice@example.com',
        role: 'user',
      },
    });

    await prisma.userSettings.create({
      data: {
        userId: user2.id,
        name: 'Bob Smith',
        email: 'bob@example.com',
        role: 'user',
      },
    });

    await prisma.userSettings.create({
      data: {
        userId: adminUser.id,
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
      },
    });

    logger.info('Created user settings');

    // Create billing records
    await prisma.billing.create({
      data: {
        userId: user1.id,
        plan: 'pro',
        usage: 45000,
        monthlyLimit: 1000000,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.billing.create({
      data: {
        userId: user2.id,
        plan: 'free',
        usage: 8500,
        monthlyLimit: 10000,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.billing.create({
      data: {
        userId: adminUser.id,
        plan: 'enterprise',
        usage: 500000,
        monthlyLimit: 10000000,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info('Created billing records');

    // Create projects for user1
    const apiKey1 = generateApiKey();
    const apiKeyHash1 = await hashApiKey(apiKey1);

    const project1 = await prisma.project.create({
      data: {
        userId: user1.id,
        name: 'Production LLM Service',
        apiKeyHash: apiKeyHash1,
      },
    });

    const apiKey2 = generateApiKey();
    const apiKeyHash2 = await hashApiKey(apiKey2);

    const project2 = await prisma.project.create({
      data: {
        userId: user1.id,
        name: 'Development Testing',
        apiKeyHash: apiKeyHash2,
      },
    });

    // Create project for user2
    const apiKey3 = generateApiKey();
    const apiKeyHash3 = await hashApiKey(apiKey3);

    const project3 = await prisma.project.create({
      data: {
        userId: user2.id,
        name: 'Research Project',
        apiKeyHash: apiKeyHash3,
      },
    });

    logger.info('Created 3 sample projects');

    // Create API keys
    await prisma.apiKey.create({
      data: {
        projectId: project1.id,
        keyHash: apiKeyHash1,
      },
    });

    await prisma.apiKey.create({
      data: {
        projectId: project2.id,
        keyHash: apiKeyHash2,
      },
    });

    await prisma.apiKey.create({
      data: {
        projectId: project3.id,
        keyHash: apiKeyHash3,
      },
    });

    logger.info('Created API keys');

    // Create project settings
    await prisma.projectSettings.create({
      data: {
        projectId: project1.id,
        preferredModel: 'gpt-4',
        safetyThreshold: 75,
        rateLimit: 1000,
        systemPrompt: 'You are a helpful assistant.',
      },
    });

    await prisma.projectSettings.create({
      data: {
        projectId: project2.id,
        preferredModel: 'gpt-3.5-turbo',
        safetyThreshold: 60,
        rateLimit: 500,
      },
    });

    await prisma.projectSettings.create({
      data: {
        projectId: project3.id,
        preferredModel: 'o3-mini',
        safetyThreshold: 80,
        rateLimit: 2000,
      },
    });

    logger.info('Created project settings');

    // Create sample LLM requests for project1
    const now = new Date();
    let requestCount = 0;

    // Normal requests
    for (let i = 0; i < 15; i++) {
      await prisma.lLMRequest.create({
        data: {
          projectId: project1.id,
          prompt: `What is the capital of France? (Request ${i + 1})`,
          response: 'The capital of France is Paris.',
          model: 'gpt-4',
          latency: 1200 + Math.random() * 800,
          tokens: 45,
          riskScore: Math.floor(Math.random() * 30),
          createdAt: new Date(now.getTime() - (15 - i) * 60 * 60 * 1000),
        },
      });
      requestCount++;
    }

    // High-risk requests
    for (let i = 0; i < 5; i++) {
      await prisma.lLMRequest.create({
        data: {
          projectId: project1.id,
          prompt: 'How to bypass security measures?',
          response: 'I cannot provide information on bypassing security measures.',
          model: 'gpt-4',
          latency: 3500 + Math.random() * 2000,
          tokens: 120,
          riskScore: 75 + Math.floor(Math.random() * 25),
          createdAt: new Date(now.getTime() - (20 - i) * 60 * 60 * 1000),
        },
      });
      requestCount++;
    }

    // Error requests
    for (let i = 0; i < 3; i++) {
      await prisma.lLMRequest.create({
        data: {
          projectId: project1.id,
          prompt: 'Test request that will timeout',
          response: '',
          model: 'gpt-4',
          latency: 6000,
          tokens: 0,
          riskScore: 50,
          error: 'Request timeout after 30 seconds',
          createdAt: new Date(now.getTime() - (25 - i) * 60 * 60 * 1000),
        },
      });
      requestCount++;
    }

    logger.info(`Created ${requestCount} sample LLM requests for project1`);

    // Create sample LLM requests for project2
    for (let i = 0; i < 10; i++) {
      await prisma.lLMRequest.create({
        data: {
          projectId: project2.id,
          prompt: `Development test prompt ${i + 1}`,
          response: `Development test response ${i + 1}`,
          model: 'gpt-3.5-turbo',
          latency: 800 + Math.random() * 400,
          tokens: 30 + Math.floor(Math.random() * 50),
          riskScore: Math.floor(Math.random() * 20),
          createdAt: new Date(now.getTime() - (10 - i) * 60 * 60 * 1000),
        },
      });
    }

    logger.info('Created sample LLM requests for project2');

    // Create sample LLM requests for project3
    for (let i = 0; i < 8; i++) {
      await prisma.lLMRequest.create({
        data: {
          projectId: project3.id,
          prompt: `Research query ${i + 1}`,
          response: `Research response ${i + 1}`,
          model: 'o3-mini',
          latency: 1500 + Math.random() * 1000,
          tokens: 60 + Math.floor(Math.random() * 100),
          riskScore: Math.floor(Math.random() * 40),
          createdAt: new Date(now.getTime() - (8 - i) * 60 * 60 * 1000),
        },
      });
    }

    logger.info('Created sample LLM requests for project3');

    // Create sample incidents for project1
    const incident1 = await prisma.incident.create({
      data: {
        projectId: project1.id,
        severity: 'high',
        triggerType: 'high_risk_score',
        status: 'open',
        rootCause: 'Multiple high-risk prompts detected in the last hour',
        recommendedFix: 'Review and update safety thresholds, consider enabling additional content filters',
        affectedRequests: 5,
        metadata: {
          averageRiskScore: 82,
          threshold: 80,
          detectionTime: new Date().toISOString(),
        },
      },
    });

    const incident2 = await prisma.incident.create({
      data: {
        projectId: project1.id,
        severity: 'medium',
        triggerType: 'latency_spike',
        status: 'open',
        rootCause: 'Increased latency detected, possible API rate limiting',
        recommendedFix: 'Check API quota usage and consider upgrading plan',
        affectedRequests: 3,
        metadata: {
          averageLatency: 5200,
          threshold: 5000,
          detectionTime: new Date().toISOString(),
        },
      },
    });

    const incident3 = await prisma.incident.create({
      data: {
        projectId: project1.id,
        severity: 'low',
        triggerType: 'error_rate',
        status: 'resolved',
        rootCause: 'Temporary network connectivity issue',
        recommendedFix: 'No action required, issue has been resolved',
        affectedRequests: 2,
        metadata: {
          errorRate: 0.12,
          threshold: 0.1,
          detectionTime: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        },
        resolvedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      },
    });

    logger.info('Created 3 sample incidents');

    // Create remediation actions
    await prisma.remediationAction.create({
      data: {
        incidentId: incident1.id,
        actionType: 'increase_safety_threshold',
        parameters: {
          oldThreshold: 75,
          newThreshold: 85,
        },
        executed: true,
        executedAt: new Date(),
        metadata: {
          appliedBy: 'system',
          reason: 'Automatic remediation for high-risk incident',
        },
      },
    });

    await prisma.remediationAction.create({
      data: {
        incidentId: incident2.id,
        actionType: 'rate_limit_user',
        parameters: {
          userId: user1.id,
          newLimit: 500,
          duration: 3600,
        },
        executed: false,
        metadata: {
          suggestedBy: 'system',
          reason: 'Pending approval for rate limiting',
        },
      },
    });

    logger.info('Created remediation actions');

    // Create metrics cache entries
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.metricsCache.create({
      data: {
        projectId: project1.id,
        date: today,
        totalRequests: 23,
        errorCount: 3,
        errorRate: 0.13,
        averageLatency: 2800,
        totalTokens: 2450,
        estimatedCost: 0.075,
        highRiskCount: 5,
        averageRiskScore: 45.2,
        modelBreakdown: JSON.stringify([
          { model: 'gpt-4', count: 23 },
        ]),
      },
    });

    await prisma.metricsCache.create({
      data: {
        projectId: project2.id,
        date: today,
        totalRequests: 10,
        errorCount: 0,
        errorRate: 0,
        averageLatency: 950,
        totalTokens: 400,
        estimatedCost: 0.004,
        highRiskCount: 0,
        averageRiskScore: 12.5,
        modelBreakdown: JSON.stringify([
          { model: 'gpt-3.5-turbo', count: 10 },
        ]),
      },
    });

    await prisma.metricsCache.create({
      data: {
        projectId: project3.id,
        date: today,
        totalRequests: 8,
        errorCount: 0,
        errorRate: 0,
        averageLatency: 1850,
        totalTokens: 560,
        estimatedCost: 0.001,
        highRiskCount: 0,
        averageRiskScore: 22.1,
        modelBreakdown: JSON.stringify([
          { model: 'o3-mini', count: 8 },
        ]),
      },
    });

    logger.info('Created metrics cache entries');

    logger.info('✅ Database seed completed successfully!');
    logger.info(`
    Sample Users Created:
    - alice@example.com (Pro plan)
    - bob@example.com (Free plan)
    - admin@example.com (Enterprise plan)
    
    Password for all users: SecurePass123!
    
    Sample Projects:
    - Production LLM Service (alice)
    - Development Testing (alice)
    - Research Project (bob)
    
    Sample Data:
    - 41 LLM requests across projects
    - 3 incidents (2 open, 1 resolved)
    - 2 remediation actions
    - Metrics cache for today
    `);
  } catch (error) {
    logger.error({ error }, 'Error seeding database');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
