// Backward Compatibility Adapter
// File: src/types/unified-rag-adapter.ts
// This file provides backward compatibility during migration

import { 
  BaseRAGDocument, 
  BaseCustomerProfile, 
  BaseConversationContext,
  BaseAIResponse 
} from './base-rag';

import { 
  InsuranceCustomerProfile,
  InsuranceConversationContext,
  PremiumCalculationRule,
  RiskFactor 
} from '../domains/insurance/types';

// Legacy type aliases for backward compatibility
export type EnhancedRAGDocument = BaseRAGDocument;
export type CustomerProfile = BaseCustomerProfile;
export type ConversationContext = BaseConversationContext;
export type AIResponse = BaseAIResponse;

// Re-export insurance types for legacy imports
export { PremiumCalculationRule, RiskFactor };
export type { InsuranceCustomerProfile, InsuranceConversationContext };

// Legacy conversion functions
export function convertLegacyCustomerProfile(legacy: any): BaseCustomerProfile {
  return {
    age: legacy.age,
    location: legacy.location || 'unknown',
    occupation: legacy.occupation,
    incomeRange: legacy.incomeRange || 'medium',
    familySize: legacy.familySize,
    riskTolerance: legacy.riskTolerance || 'medium',
    communicationPreference: 'chat',
    decisionMakingStyle: 'practical',
    urgencyLevel: 'medium',
    previousInteractions: 0,
    loyaltyLevel: 'new',
    budgetSensitive: false,
    valueSeeker: true,
    premiumBuyer: false,
    domainSpecific: legacy.insuranceSpecific || {}
  };
}

export function convertLegacyConversationContext(legacy: any): BaseConversationContext {
  return {
    domain: legacy.domain || 'insurance',
    stage: legacy.stage || 'initial',
    messageCount: legacy.messageCount || 0,
    conversationHistory: legacy.conversationHistory || [],
    startTime: new Date(),
    lastInteractionTime: new Date(),
    topicsDiscussed: legacy.topicsDiscussed || [],
    questionsAsked: legacy.questionsAsked || 0,
    informationProvided: legacy.informationProvided || [],
    customerInfo: legacy.customerInfo || {},
    productInterest: legacy.productInterest || [],
    serviceNeeds: legacy.serviceNeeds || [],
    buyingSignals: legacy.buyingSignals || [],
    domainSpecific: legacy.insuranceSpecific || {}
  };
}