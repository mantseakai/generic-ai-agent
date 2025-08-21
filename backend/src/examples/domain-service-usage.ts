// Domain Service Usage Examples
// File: src/examples/domain-service-usage.ts

import { AIService } from '../services/AIService';
import { InsuranceAIService } from '../domains/insurance/services/InsuranceAIService';
import { ResortAIService } from '../domains/resort/services/ResortAIService';
import { PensionAIService } from '../domains/pension/services/PensionAIService';
import { InsuranceDomainConfig } from '../config/InsuranceDomainConfig';
import { ResortDomainConfig } from '../config/ResortDomainConfig';
import { PensionDomainConfig } from '../config/PensionDomainConfig';

// Example 1: Using consolidated AIService for any domain
async function createGenericAIAgent(domain: string, clientId?: string) {
  const domainConfig = getDomainConfig(domain);
  const clientConfig = clientId ? await getClientConfig(clientId) : undefined;
  
  const aiService = new AIService(domainConfig, clientConfig);
  await aiService.initialize();
  
  return aiService;
}

// Example 2: Using domain-specific service for insurance
async function createInsuranceAgent(clientId?: string) {
  const clientConfig = clientId ? await getClientConfig(clientId) : undefined;
  
  const insuranceService = new InsuranceAIService(InsuranceDomainConfig, clientConfig);
  await insuranceService.initialize();
  
  return insuranceService;
}

// Example 3: Multi-client usage
async function handleMultiClientMessage(clientId: string, domain: string, userId: string, message: string) {
  const aiService = await createGenericAIAgent(domain, clientId);
  return await aiService.processMessage(userId, message);
}